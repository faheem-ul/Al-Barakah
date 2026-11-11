import React from "react";

type VoucherEmailStatusBadgeProps = {
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-[#ecfdf3] text-[#027a48] border-[#abefc6]",
  failed: "bg-[#fef3f2] text-[#b42318] border-[#fecdca]",
  pending: "bg-[#fffaeb] text-[#b54708] border-[#fedf89]",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Sent",
  failed: "Failed",
  pending: "Pending",
};

const VoucherEmailStatusBadge: React.FC<VoucherEmailStatusBadgeProps> = ({
  status,
}) => {
  const key = STATUS_STYLES[status] ? status : "pending";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[key]}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
};

export default VoucherEmailStatusBadge;
