import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { documentTypeOptions, departments, projectCodes, projectTechnologies } from '../constants/referenceData';
import { apiFetch } from '../lib/api';
import type { ClientPurchaseRequestDraft, DocumentType } from '../types';

const initialLineItem = { activity: '', unitPrice: 0, quantity: 1 };

const createDefaultDraft = (): ClientPurchaseRequestDraft => ({
  projectName: projectCodes[0]?.name ?? '',
  projectCode: projectCodes[0]?.code ?? '',
  projectTechnology: projectTechnologies[0] ?? '',
  department: departments[0] ?? '',
  requestDate: new Date().toISOString().slice(0, 10),
  serviceDescription: '',
  lineItems: [{ ...initialLineItem }],
  documentType: 'quote',
  contractDetails: { validFrom: '', validTo: '', paymentTerms: '' },
  attachments: [],
  localFiles: []
});

export default function RequestFormPage() {
  const [draft, setDraft] = useState<ClientPurchaseRequestDraft>(() => createDefaultDraft());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const totalCost = useMemo(
    () =>
      draft.lineItems.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity;
      }, 0),
    [draft.lineItems]
  );

  const supportingDocHint = useMemo(() => {
    switch (draft.documentType) {
      case 'invoice':
        return 'Invoices trigger accounting checks for SAP upload and bank submission.';
      case 'quote':
        return 'Quotes are required for existing vendors and unlock two analyst checkboxes.';
      case 'contract':
        return 'Contracts require validity dates and payment terms for analyst review.';
      default:
        return '';
    }
  }, [draft.documentType]);

  function updateLineItem(index: number, field: 'activity' | 'unitPrice' | 'quantity', value: string) {
    setDraft((prev) => {
      const next = [...prev.lineItems];
      const parsedValue = field === 'activity' ? value : Number(value) || 0;
      next[index] = { ...next[index], [field]: parsedValue };
      return { ...prev, lineItems: next };
    });
  }

  function addLineItem() {
    setDraft((prev) => ({ ...prev, lineItems: [...prev.lineItems, { ...initialLineItem }] }));
  }

  function handleDocumentTypeChange(value: DocumentType) {
    setDraft((prev) => ({ ...prev, documentType: value }));
  }

  function updateContract(field: 'validFrom' | 'validTo' | 'paymentTerms', value: string) {
    setDraft((prev) => {
      const details = prev.contractDetails ?? { validFrom: '', validTo: '', paymentTerms: '' };
      return { ...prev, contractDetails: { ...details, [field]: value } };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('projectName', draft.projectName);
      formData.append('projectCode', draft.projectCode);
      formData.append('projectTechnology', draft.projectTechnology);
      formData.append('department', draft.department);
      formData.append('requestDate', draft.requestDate ?? '');
      formData.append('serviceDescription', draft.serviceDescription);
      formData.append('lineItems', JSON.stringify(draft.lineItems));
      formData.append('documentType', draft.documentType);
      if (draft.contractDetails && draft.documentType === 'contract') {
        formData.append('contractDetails', JSON.stringify(draft.contractDetails));
      }
      draft.localFiles.forEach((file) => formData.append('attachments', file));

      await apiFetch('/requests', {
        method: 'POST',
        body: formData
      });

      setDraft(createDefaultDraft());
      navigate('/requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <header>
        <h2>Purchase Requisition</h2>
        <p>Complete the form below. Dropdown values mimic the provided paper form.</p>
      </header>

      <form className="request-form" onSubmit={handleSubmit}>
        <div className="grid two-col">
          <label>
            Project Code
            <select
              value={draft.projectCode}
              onChange={(event) => {
                const { value } = event.target;
                const project = projectCodes.find((p) => p.code === value);
                setDraft((prev) => ({ ...prev, projectCode: value, projectName: project?.name ?? prev.projectName }));
              }}
            >
              {projectCodes.map((project) => (
                <option key={project.code} value={project.code}>
                  {project.code}
                </option>
              ))}
            </select>
          </label>

          <label>
            Project Technology
            <select
              value={draft.projectTechnology}
              onChange={(event) => setDraft((prev) => ({ ...prev, projectTechnology: event.target.value }))}
            >
              {projectTechnologies.map((technology) => (
                <option key={technology} value={technology}>
                  {technology}
                </option>
              ))}
            </select>
          </label>

          <label>
            Department
            <select value={draft.department} onChange={(event) => setDraft((prev) => ({ ...prev, department: event.target.value }))}>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date Raised
            <input type="date" value={draft.requestDate} onChange={(event) => setDraft((prev) => ({ ...prev, requestDate: event.target.value }))} />
          </label>
        </div>

        <label>
          Description of Service
          <textarea
            value={draft.serviceDescription}
            rows={4}
            placeholder="Hire of chairs, transport, etc..."
            onChange={(event) => setDraft((prev) => ({ ...prev, serviceDescription: event.target.value }))}
          />
        </label>

        <section className="line-items">
          <div className="section-header">
            <h3>Line Items</h3>
            <button type="button" className="ghost" onClick={addLineItem}>
              + Add Item
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Activity</th>
                <th>Unit Price (ZMW)</th>
                <th>Quantity</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {draft.lineItems.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={item.activity}
                      onChange={(event) => updateLineItem(index, 'activity', event.target.value)}
                      placeholder="Meals and drinks"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(event) => updateLineItem(index, 'unitPrice', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => updateLineItem(index, 'quantity', event.target.value)}
                    />
                  </td>
                  <td>{(item.unitPrice * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total</td>
                <td>{totalCost.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section>
          <h3>Supporting Documentation</h3>
          <p className="hint">{supportingDocHint}</p>

          <div className="grid two-col">
            <label>
              Document Type
              <select value={draft.documentType} onChange={(event) => handleDocumentTypeChange(event.target.value as DocumentType)}>
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Attach Files
              <input
                type="file"
                multiple
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setDraft((prev) => ({
                    ...prev,
                    localFiles: files,
                    attachments: files.map((file, index) => ({
                      id: `${file.name}-${index}`,
                      filename: file.name,
                      mimeType: file.type,
                      size: file.size
                    }))
                  }));
                }}
              />
            </label>
          </div>

          {draft.localFiles.length > 0 && (
            <ul className="file-list">
              {draft.localFiles.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          )}

          {draft.documentType === 'contract' && (
            <div className="grid two-col">
              <label>
                Contract Valid From
                <input type="date" value={draft.contractDetails?.validFrom} onChange={(event) => updateContract('validFrom', event.target.value)} />
              </label>
              <label>
                Contract Valid To
                <input type="date" value={draft.contractDetails?.validTo} onChange={(event) => updateContract('validTo', event.target.value)} />
              </label>
              <label className="full-width">
                Payment Terms
                <textarea
                  rows={3}
                  placeholder="50% deposit to begin works, etc."
                  value={draft.contractDetails?.paymentTerms}
                  onChange={(event) => updateContract('paymentTerms', event.target.value)}
                />
              </label>
            </div>
          )}
        </section>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </form>
    </section>
  );
}
