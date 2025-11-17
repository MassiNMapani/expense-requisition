# Expense Requisition Platform

A full‑stack web application that digitizes the expense/purchase requisition process for the finance department. The goal is to replicate the attached purchase requisition form, enforce the approval hierarchy, and provide finance leadership with visibility into spending and project allocations.

## High-Level Requirements

| Requirement | Details |
| --- | --- |
| Request form | React form that mirrors the provided paper form (project metadata, line items, service description, signatures/approvals). Select inputs for Project Code, Project Technology, Department must be pre-populated from reference data. |
| Request ID | Every request receives a UUID-based purchase requisition number. |
| Attachments | Users can upload supporting files. Validation rules depend on vendor scenario and document type (see Supporting Documents). |
| Approval flow | Workflow escalates to the highest outstanding approver based on the requestor’s role. Approvers can approve or reject with an explanation. |
| Status visibility | Requestors can see the end-to-end status from creation through accounting processing and bank submission. |
| Accounting processing | Analysts confirm processing via checkboxes that depend on the uploaded document type. |
| Dashboards | CFO and Super User can visualize total spend, spend per project/technology, counts per status, and perform CRUD on requests. |

## Roles & Permissions

1. **Requestor** – creates requests, attaches documents, tracks statuses, edits drafts prior to first submission.
2. **Head of Department (HOD)** – first approver for all non-HOD requests; can review/approve/reject; sees departmental pipeline.
3. **Chief Finance Officer (CFO)** – super user. Reviews after HOD, can override decisions, access dashboards, perform CRUD on any request.
4. **Chief Executive Officer (CEO)** – final approver where applicable; receives requests escalated from CFO.
5. **Accounting Analyst** – receives fully approved requests, confirms manual downstream processing via checkboxes.
6. **Super User** – administrative role (superset of CFO) with system-wide dashboards and CRUD operations.

**Approval routing rules**
- Requestors who are employees or analysts: HOD → CFO → CEO.
- HOD-created requests: CFO → CEO.
- CFO-created requests: CEO.
- CEO-created requests: no approvers; goes straight to Accounting Analysts for processing.

Rejections always require a comment, are visible to the requestor, and halt downstream steps until resubmitted.

## Supporting Documents & Validation

| Scenario | Required Uploads | Additional Fields |
| --- | --- | --- |
| New vendor (not in reference data) | Bank letter, Bank details, TPIN certificate | Optional invoice/quote/contract. |
| Existing vendor | Quote (mandatory) | Optional invoice or contract. |
| Invoice uploaded | Accounting must see three checkboxes: “Docs reviewed”, “Loaded into SAP”, “Loaded for bank payment”. |
| Quote uploaded | Accounting sees two checkboxes: “Docs reviewed”, “Loaded for bank payment”. |
| Contract uploaded | Requestor must input contract validity dates, payment terms text (e.g., “50% deposit to begin works, 10% each milestone…”), payment schedule dates, payment amounts. Accounting sees “Payment terms acceptable” and “Loaded for bank payment”. |

## Workflow States

1. Draft (optional pre-submit state).
2. Submitted → Awaiting HOD approval.
3. Approved/Rejected by HOD.
4. Approved/Rejected by CFO.
5. Approved/Rejected by CEO.
6. Accounting Analyst processing (checkboxes as above).
7. Loaded with bank (final state) or Rejected (terminal state with reason).

Each transition records timestamps, actor, comments, and attachments.

## Tech Stack

- **Client**: React + Vite + TypeScript, component library TBD (e.g., MUI) for form controls and tables.
- **Server**: Node.js, Express, TypeScript. REST APIs with role-based access control.
- **Database**: MongoDB (collections for users, requests, approval history, reference data, attachments metadata).
- **Authentication**: JWT or company SSO integration (to be defined). Roles stored with users.
- **File storage**: GridFS or object storage (S3 equivalent) referenced from MongoDB.

## Initial Data Model Sketch

```text
users: { _id, name, email, role, departmentId, createdAt }
departments/projects: reference tables for dropdowns
requests: {
  _id (UUID), projectCode, projectTechnologyId, departmentId,
  requesterId, lineItems[], serviceDescription, vendorId/null,
  documentType (invoice|quote|contract|other), contractDetails?,
  status, statusHistory[], attachments[], totals, createdAt, updatedAt
}
approvalHistory entries: { requestId, approverRole, decision, comment, timestamp }
attachment metadata: { requestId, filename, type, storagePath, uploadedBy, uploadedAt }
```

## Next Steps

1. Set up monorepo structure (e.g., `apps/client`, `apps/server`, `packages/shared` for models).
2. Define API contracts & shared TypeScript types for requests, approvals, dashboards.
3. Implement authentication & RBAC middleware.
4. Build the React request form with validation and conditional attachments.
5. Implement approval workflow endpoints and UI states.
6. Add dashboards and reporting for CFO/Super User personas.

This README captures the baseline scope so we can iterate on implementation details. Let me know if any requirement needs refinement before scaffolding the codebase.

## Local Setup

1. **Prerequisites**
   - Node.js 20+
   - MongoDB running locally. Homebrew install users can run `brew services start mongodb-community`.
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   ```bash
   cp apps/server/.env.example apps/server/.env
   # edit apps/server/.env
   MONGO_URI=mongodb://localhost:27017/expense-requisition
   JWT_SECRET=your-secret
   ```
4. **Seed default users**
   ```bash
   npm run seed -w apps/server
   ```
   Default password is `Password#1`; users will be forced to change it on first login.
5. **Run the dev servers**
   ```bash
   npm run dev:server   # starts Express API on http://localhost:4000
   npm run dev:client   # starts Vite on http://localhost:5173
   ```
6. **Build for production**
   ```bash
   npm run build
   ```
