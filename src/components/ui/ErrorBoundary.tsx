import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Copy, Check } from 'lucide-react';
import './ErrorBoundary.css';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        copied: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, copied: false };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleCopyError = () => {
        if (!this.state.error) return;
        const errorText = `${this.state.error.name}: ${this.state.error.message}\n\nStack:\n${this.state.error.stack || 'No stack trace available'}`;
        navigator.clipboard
            .writeText(errorText)
            .then(() => {
                this.setState({ copied: true });
                setTimeout(() => this.setState({ copied: false }), 2000);
            })
            .catch((err) => {
                console.warn('[ErrorBoundary] Failed to copy error to clipboard:', err);
            });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-screen">
                    <div className="error-boundary-card">
                        <div className="error-boundary-icon">
                            <AlertTriangle size={36} color="var(--semantic-danger, #ef4444)" />
                        </div>
                        <h2 className="error-boundary-title">Pokérole Extension Encountered an Error</h2>
                        <p className="error-boundary-desc text-subtext">
                            The application encountered an unexpected runtime error. You can try reloading the extension
                            or copy the error details below to share for troubleshooting.
                        </p>
                        {this.state.error && (
                            <pre className="error-boundary-details">
                                {this.state.error.name}: {this.state.error.message}
                            </pre>
                        )}
                        <div className="error-boundary-actions">
                            <button
                                type="button"
                                className="action-button action-button--theme"
                                onClick={this.handleReload}
                            >
                                <RotateCcw size={15} /> Reload App
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={this.handleCopyError}
                                title="Copy error details to clipboard"
                            >
                                {this.state.copied ? (
                                    <>
                                        <Check size={15} color="var(--hp-green, #22c55e)" /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={15} /> Copy Error Details
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
