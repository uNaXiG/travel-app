import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
    isOpen = true,
    onClose,
    title,
    eyebrow,
    children,
    footer,
    maxWidth = '500px',
    ariaLabelledBy = 'travel-modal-title',
    className = '',
}) {
    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="travel-modal-backdrop" role="presentation">
            <section
                className={`travel-modal ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy}
                style={{ maxWidth }}
            >
                <header className="travel-modal-header">
                    <div>
                        {eyebrow && <p className="travel-modal-eyebrow">{eyebrow}</p>}
                        <h2 id={ariaLabelledBy} className="travel-modal-title">{title}</h2>
                    </div>
                    {onClose && (
                        <button
                            className="travel-modal-close"
                            type="button"
                            aria-label="關閉視窗"
                            onClick={onClose}
                        >
                            <X size={18} />
                        </button>
                    )}
                </header>
                <div className="travel-modal-content">
                    {children}
                </div>
                {footer && (
                    <footer className="travel-modal-footer">
                        {footer}
                    </footer>
                )}
            </section>
        </div>
    );
}
