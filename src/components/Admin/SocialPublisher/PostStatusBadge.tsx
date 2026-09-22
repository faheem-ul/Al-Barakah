import React from "react";

type PostStatusBadgeProps = {
  status?: string;
};

const STATUS_STYLES: Record<string, string> = {
  published: "bg-[#ecfdf3] text-[#027a48] border-[#abefc6]",
  failed: "bg-[#fef3f2] text-[#b42318] border-[#fecdca]",
  pending: "bg-[#fffaeb] text-[#b54708] border-[#fedf89]",
  not_implemented: "bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]",
};

const STATUS_LABELS: Record<string, string> = {
  published: "Published",
  failed: "Failed",
  pending: "Pending",
  not_implemented: "N/A",
};

const PostStatusBadge: React.FC<PostStatusBadgeProps> = ({ status }) => {
  const key = status && STATUS_STYLES[status] ? status : "pending";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[key]}`}
    >
      {STATUS_LABELS[key] ?? "—"}
    </span>
  );
};

export default PostStatusBadge;
