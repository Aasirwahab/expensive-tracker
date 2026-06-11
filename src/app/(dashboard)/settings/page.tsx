import { Settings as SettingsIcon } from "lucide-react";
import { getActiveContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/panel";
import { BusinessProfileForm } from "@/features/settings/business-profile-form";
import {
  AddCategoryForm,
  RemoveCategoryButton,
} from "@/features/settings/category-manager";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const ctx = await getActiveContext();
  if (!ctx?.business) return null; // layout handles the redirect to onboarding

  if (ctx.role !== "OWNER") {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink/5 text-ink">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Settings
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the owner can change settings.
          </p>
        </div>
      </div>
    );
  }

  const business = ctx.business;
  const categories = await prisma.expenseCategory.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-bold tracking-tight">
          Settings
        </p>
        <p className="text-sm text-muted">Manage your shop.</p>
      </div>

      <Panel title="Business profile">
        <BusinessProfileForm
          name={business.name}
          businessType={business.businessType ?? ""}
        />
      </Panel>

      <Panel title="Shop details" subtitle="Fixed for the pilot — ask to change">
        <div className="divide-y divide-line/60">
          <InfoRow label="Currency" value="Rs — Sri Lankan Rupee (LKR)" />
          <InfoRow label="Timezone" value={business.timezone} />
          <InfoRow
            label="Week starts on"
            value={business.weekStartsOn === 0 ? "Sunday" : "Monday"}
          />
          <InfoRow label="Plan" value="Pilot (free)" />
        </div>
      </Panel>

      <Panel
        title="Expense categories"
        subtitle="These appear when recording an expense"
      >
        <div className="space-y-4">
          <AddCategoryForm />
          {categories.length === 0 ? (
            <p className="text-sm text-muted">No categories yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-sm"
                >
                  {c.name}
                  <RemoveCategoryButton id={c.id} />
                </span>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Danger zone">
        <p className="text-sm text-muted">
          Closing your shop and deleting all its data isn&apos;t available in the
          pilot yet — contact support if you need it.
        </p>
      </Panel>
    </div>
  );
}
