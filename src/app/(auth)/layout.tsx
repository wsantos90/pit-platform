import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "P.I.T - Authentication",
  description: "Performance - Intelligence - Tracking Authentication",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-bold tracking-tighter text-primary">P.I.T</h1>
          </div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            Performance - Intelligence - Tracking
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
