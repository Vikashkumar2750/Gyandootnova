import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { reportError } from "@/lib/selfHeal";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  recovering: boolean;
}

/**
 * Catches render crashes, reports them for auto-healing, and retries once
 * on its own before showing a friendly fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, recovering: false };
  private retried = false;

  static getDerivedStateFromError(): State {
    return { hasError: true, recovering: true };
  }

  componentDidCatch(error: Error) {
    void reportError(error, "boundary");
    if (!this.retried) {
      this.retried = true;
      // Silent self-recovery: remount the tree once.
      setTimeout(() => this.setState({ hasError: false, recovering: false }), 600);
    } else {
      this.setState({ recovering: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.recovering) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          <span>ठीक किया जा रहा है…</span>
        </div>
      );
    }

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="font-serif text-2xl">कुछ गड़बड़ हो गई</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          हमारी टीम को इसकी सूचना अपने आप भेज दी गई है। आप पेज दोबारा लोड कर सकते हैं।
        </p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" /> दोबारा लोड करें
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
