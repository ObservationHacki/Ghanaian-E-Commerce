import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Storefront error boundary', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container-narrow flex min-h-[70vh] flex-col items-center justify-center py-28 text-center md:py-40">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-accent-ink">
          Error 500
        </p>
        <h1 className="mt-4 text-headline text-foreground">Something went wrong</h1>
        <p className="mt-5 max-w-md text-lede text-ink-muted text-pretty">
          We hit an unexpected problem loading this page. You can try again or head back to the
          store.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button variant="accent" size="pill-lg" onClick={this.reset}>
            Try again
          </Button>
          <Button variant="hairline" size="pill-lg" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }
}
