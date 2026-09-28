"use client";

export function AutoSubmitMonth({
  defaultValue,
  label = "เดือนที่ทำรายการ"
}: {
  defaultValue: string;
  label?: string;
}) {
  return (
    <label className="min-w-0 flex-1 text-sm font-medium text-slate-700 sm:max-w-xs">
      {label}
      <input
        aria-label={label}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        defaultValue={defaultValue}
        name="month"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        type="month"
      />
    </label>
  );
}
