import './AuthLoadingIndicator.css';

interface AuthLoadingIndicatorProps {
    message?: string;
    progress?: number;
}

export function AuthLoadingIndicator({ 
    message = 'Authenticating...', 
    progress = 0 
}: AuthLoadingIndicatorProps) {
    return (
        <div className="auth-loading-overlay">
            <div className="auth-loading-card">
                <div className="auth-loading-animation">
                    <div className="auth-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring delay-1"></div>
                        <div className="spinner-ring delay-2"></div>
                    </div>
                </div>
                
                <div className="auth-loading-content">
                    <h3 className="auth-loading-title">Verifying Credentials</h3>
                    <p className="auth-loading-message">{message}</p>
                    
                    {progress > 0 && (
                        <div className="auth-progress-bar">
                            <div 
                                className="auth-progress-fill"
                                style={{ width: `${Math.min(100, progress)}%` }}
                            />
                        </div>
                    )}
                    
                    <div className="auth-security-steps">
                        <div className="security-step">
                            <span className="step-icon">🔐</span>
                            <span className="step-text">Encrypting connection</span>
                        </div>
                        <div className="security-step">
                            <span className="step-icon">👤</span>
                            <span className="step-text">Validating identity</span>
                        </div>
                        <div className="security-step">
                            <span className="step-icon">🛡️</span>
                            <span className="step-text">Checking permissions</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}