import { Router, type IRouter } from "express";
import {
  DecideApprovalBody,
  GetReceiptResponse,
  GetDashboardResponse,
  ListAgentRunsResponse,
  ListReceiptsResponse,
  ProcessReceiptBody,
  ProcessReceiptResponse,
} from "@workspace/api-zod";
import { auditEvent, CRA_SOURCE, GIFI_SOURCE, ITC_SOURCE, loadStore, persistStore, processReceipt, RULE_VERSION } from "../domain/copilot";

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  const store = loadStore();
  const data = {
    pending: store.receipts.filter((receipt) => receipt.status === "pending").length,
    processed: store.receipts.filter((receipt) => receipt.status === "processed").length,
    review: store.receipts.filter((receipt) => receipt.status === "review").length,
    totalEligibleItc: Number(store.receipts.reduce((sum, receipt) => sum + (receipt.eligibleItc ?? 0), 0).toFixed(2)),
    ruleVersion: RULE_VERSION,
    recentAuditEvents: store.auditEvents.slice(0, 8),
  };
  res.json(GetDashboardResponse.parse(data));
});

router.get("/receipts", (_req, res) => {
  const store = loadStore();
  res.json(ListReceiptsResponse.parse(store.receipts));
});

router.get("/receipts/:receiptId", (req, res) => {
  const store = loadStore();
  const receipt = store.receipts.find((item) => item.id === req.params.receiptId);
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  res.json(GetReceiptResponse.parse(receipt));
});

router.post("/agent/process", (req, res) => {
  const parsed = ProcessReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Tool schema validation failed", issues: parsed.error.issues });
    return;
  }
  const store = loadStore();
  const result = processReceipt(store, parsed.data.receiptId, parsed.data.userMessage ?? "");
  if (!result) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  res.json(ProcessReceiptResponse.parse(result));
});

router.get("/agent/runs", (_req, res) => {
  const store = loadStore();
  res.json(ListAgentRunsResponse.parse(store.runs.slice(0, 20)));
});

router.post("/approvals/:approvalId", (req, res) => {
  const parsed = DecideApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Approval decision schema validation failed", issues: parsed.error.issues });
    return;
  }
  const store = loadStore();
  const approval = store.approvals.find((item) => item.id === req.params.approvalId);
  if (!approval) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  approval.status = parsed.data.decision === "approve" ? "approved" : "rejected";
  approval.decidedAt = new Date().toISOString();
  const receipt = store.receipts.find((item) => item.id === approval.receiptId);
  if (receipt) {
    receipt.status = approval.status === "approved" ? "processed" : "review";
    receipt.processingStage = approval.status === "approved" ? "complete" : "review";
    receipt.updatedAt = new Date().toISOString();
  }
  store.auditEvents.unshift(auditEvent(approval.receiptId, `approval_${approval.status}`, "success", approval.reason));
  persistStore(store);
  res.json(approval);
});

export default router;