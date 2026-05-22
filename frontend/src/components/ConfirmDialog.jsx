export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" role="presentation">
      <div className={`modal-content confirm-dialog confirm-dialog--${tone}`} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="modal-header">
          <h3 id="confirm-dialog-title">{title}</h3>
          <button type="button" className="btn-secondary" style={{ padding: 4 }} onClick={onCancel} aria-label="Close confirmation dialog">
            ✕
          </button>
        </div>
        <p className="confirm-dialog__message">{message}</p>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
