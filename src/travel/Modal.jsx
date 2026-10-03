import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const modalTransitionDuration = 200;

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
    closeOnBackdrop = true,
}) {
    const [isPresent, setIsPresent] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(false);
    const closeTimerRef = useRef(null);
    const animationFrameRef = useRef([]);
    const closeRequestedRef = useRef(false);
    const modalContentRef = useRef(null);

    if (isOpen) {
        modalContentRef.current = { title, eyebrow, children, footer, maxWidth, ariaLabelledBy, className };
    }

    function transitionDelay() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : modalTransitionDuration;
    }

    function requestClose() {
        if (!onClose || closeRequestedRef.current) return;
        closeRequestedRef.current = true;
        setIsVisible(false);
        closeTimerRef.current = window.setTimeout(() => {
            setIsPresent(false);
            onClose();
        }, transitionDelay());
    }

    useEffect(() => {
        if (isOpen) {
            window.clearTimeout(closeTimerRef.current);
            closeRequestedRef.current = false;
            setIsPresent(true);
            animationFrameRef.current = [
                window.requestAnimationFrame(() => {
                    animationFrameRef.current[1] = window.requestAnimationFrame(() => setIsVisible(true));
                }),
            ];
            return () => animationFrameRef.current.forEach((frame) => window.cancelAnimationFrame(frame));
        }

        setIsVisible(false);
        const timer = window.setTimeout(() => setIsPresent(false), transitionDelay());
        return () => window.clearTimeout(timer);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !onClose) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') requestClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

    if (!isPresent) return null;

    const modalContent = modalContentRef.current || { title, eyebrow, children, footer, maxWidth, ariaLabelledBy, className };

    return createPortal((
        <div
            className={`travel-modal-backdrop${isVisible ? ' is-visible' : ''}`}
            role="presentation"
            aria-hidden={!isVisible}
            onClick={(event) => {
                if (closeOnBackdrop && event.target === event.currentTarget) requestClose();
            }}
        >
            <section
                className={`travel-modal${isVisible ? ' is-visible' : ''} ${modalContent.className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalContent.ariaLabelledBy}
                style={{ maxWidth: modalContent.maxWidth }}
            >
                <header className="travel-modal-header">
                    <div>
                        {modalContent.eyebrow && <p className="travel-modal-eyebrow">{modalContent.eyebrow}</p>}
                        <h2 id={modalContent.ariaLabelledBy} className="travel-modal-title">{modalContent.title}</h2>
                    </div>
                    {onClose && (
                        <button
                            className="travel-modal-close"
                            type="button"
                            aria-label="關閉視窗"
                            onClick={requestClose}
                        >
                            <X size={18} />
                        </button>
                    )}
                </header>
                <div className="travel-modal-content">
                    {modalContent.children}
                </div>
                {modalContent.footer && (
                    <footer className="travel-modal-footer">
                        {modalContent.footer}
                    </footer>
                )}
            </section>
        </div>
    ), document.body);
}
