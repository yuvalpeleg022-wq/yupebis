import { Component, type ReactNode } from 'react';

interface Props {
  fallback: (reset: () => void) => ReactNode;
  onError?: (error: unknown) => void;
  /** Changing this key resets the boundary */
  resetKey?: string;
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[Volterra] 3D content failed to load:', error);
    this.props.onError?.(error);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) this.setState({ hasError: false });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    return this.state.hasError ? this.props.fallback(this.reset) : this.props.children;
  }
}
