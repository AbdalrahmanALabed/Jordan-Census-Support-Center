"use client";

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 bg-card overflow-hidden shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
        <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 text-start">
          <h2 className="text-base font-black">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
