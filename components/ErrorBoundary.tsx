import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
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
    console.error(`ErrorBoundary [${this.props.name || 'Anonymous'}]:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-surface rounded-xl border border-danger-border shadow-card m-4">
          <div className="w-16 h-16 bg-danger-bg rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-danger-text" />
          </div>

          <h2 className="text-xl font-bold text-txt-main mb-2">
            Oups ! Quelque chose s'est mal passé.
          </h2>

          <p className="text-txt-secondary text-center mb-6 max-w-md">
            Une erreur inattendue est survenue{this.props.name ? ` dans ${this.props.name}` : ''}.
            Ne vous inquiétez pas, vos données sont en sécurité dans votre navigateur.
          </p>

          <div className="bg-canvas p-4 rounded-lg mb-6 w-full max-w-lg overflow-auto max-h-40 border border-border-default">
            <code className="text-xs text-danger-text whitespace-pre-wrap">
              {this.state.error?.toString()}
            </code>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={this.handleReset}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Réessayer
            </Button>

            <Button
              variant="primary"
              onClick={this.handleGoHome}
              icon={<Home className="w-4 h-4" />}
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
