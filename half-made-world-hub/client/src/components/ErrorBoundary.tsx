import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// Without this, a render error anywhere in the tree unmounts the whole app and
// the page goes blank — the user only recovers by refreshing. This catches the
// error, keeps the rest of the app alive, and offers a retry.
interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label ?? 'app'}] render error:`, error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="error-boundary">
        <div className="error-boundary-box">
          <strong className="error-boundary-title">
            {this.props.label ? `The ${this.props.label} hit an error.` : 'Something went wrong.'}
          </strong>
          <p className="error-boundary-text">{error.message}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={this.reset}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
