import Spinner from "@/ui/Spinner";

const Loading = () => {
  return (
    <div className="-mt-[100px] flex h-screen items-center justify-center">
      <Spinner fill="#8FB69F" />
    </div>
  );
};

export default Loading;
