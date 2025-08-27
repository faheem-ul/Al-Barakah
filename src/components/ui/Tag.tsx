import { cn } from "@/lib/utils";

interface PropTypes {
  title: string;
  onClick?: () => void;
  className?: string;
}

const Tag = (props: PropTypes) => {
  const { title, onClick, className } = props;

  return (
    <div
      className={cn(
        "border-primary-foreground text-primary-foreground w-fit rounded-[62] border px-6 py-2 text-[16px]",
        className,
      )}
      onClick={onClick}
    >
      {title}
    </div>
  );
};

export default Tag;
