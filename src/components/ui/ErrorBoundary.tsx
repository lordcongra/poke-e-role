import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { emergencyClearPcStorage } from '../../utils/pc/pcStorageAdapter';
import './ErrorBoundary.css';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    }

    private handleHardReset = () => {
        emergencyClearPcStorage();
        window.location.reload();
    };

    private handleReload = () => {
        window.location.reload();
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
                            The application stopped unexpectedly. This is often caused by an unresponsive storage record
                            or browser context timeout.
                        </p>
                        {this.state.error && <pre className="error-boundary-details">{this.state.error.message}</pre>}
                        <div className="error-boundary-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                onClick={this.handleReload}
                            >
                                Reload App
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                onClick={this.handleHardReset}
                            >
                                Cleanse PC Storage Cache & Reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
