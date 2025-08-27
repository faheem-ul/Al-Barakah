"use client";
import React, { useEffect, useState } from "react";
import { SVGProps } from "react";

import { Product } from "@/lib/shopify/types";
import { isOptionAvailable } from "@/lib/utils/shopify";
import { cn, isColorLight } from "@/lib/utils";
import { SWATCH_COLORS } from "@/lib/constants";
import { useCartStore } from "@/stores/useCartStore";
import Text from "@/ui/Text";

interface PropTypes {
  product: Product;
  colors: string[];
  showColorName?: boolean;
}

const Colors = (props: PropTypes) => {
  const { product, colors, showColorName } = props;

  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  const selectedColors = useCartStore((state) => state.selectedColors);
  const setSelectedColors = useCartStore((state) => state.setSelectedColor);

  useEffect(() => {
    const selectedColor = selectedColors[product.id];
    if (selectedColor) {
      setSelectedColor(selectedColor);
    } else {
      setSelectedColor(colors[0]);
      setSelectedColors(product.id, colors[0]);
    }
  }, [product, selectedColors, colors, setSelectedColors]);

  return (
    <div>
      {showColorName && <Text className="mt-2">{selectedColor}</Text>}

      <div
        className="mt-2 flex items-center gap-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {Array.isArray(colors) &&
          colors.map((color, index) => {
            const isAvailable = isOptionAvailable(product, "color", color);
            const currentColorHex = SWATCH_COLORS[color]; // Get the hex code for the current color swatch

            return (
              <button
                key={index}
                onClick={() => {
                  if (!isAvailable) return;
                  setSelectedColor(color);
                  setSelectedColors(product.id, color);
                }}
                className={cn(
                  `flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-full border`,
                  selectedColor === color && "border-slate-500",
                )}
                style={{ backgroundColor: currentColorHex }}
                aria-label={`Select color ${color}`}
              >
                {selectedColor === color && (
                  <CheckIcon
                    fill={isColorLight(currentColorHex) ? "#302A25" : "#DDDDDD"}
                  />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default Colors;

const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={14}
    height={9}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12.947 1.214 5.37 8.79a.71.71 0 0 1-1.007 0L1.048 5.476A.712.712 0 0 1 2.055 4.47l2.812 2.812L11.942.208a.712.712 0 0 1 1.006 1.007v-.001Z"
      fill={props.fill}
    />
  </svg>
);

// "use client";
// import React, { useEffect, useState } from "react";
// import { SVGProps } from "react";

// import { Product } from "@/lib/shopify/types";
// import { isOptionAvailable } from "@/lib/utils/shopify";
// import { cn } from "@/lib/utils";
// import { SWATCH_COLORS } from "@/lib/constants";
// import { useCartStore } from "@/stores/useCartStore";
// import Text from "@/ui/Text";

// interface PropTypes {
//   product: Product;
//   colors: string[];
//   showColorName?: boolean;
// }

// const Colors = (props: PropTypes) => {
//   const { product, colors, showColorName } = props;

//   const [selectedColor, setSelectedColor] = useState<string | undefined>();

//   const selectedColors = useCartStore((state) => state.selectedColors);
//   const setSelectedColors = useCartStore((state) => state.setSelectedColor);

//   useEffect(() => {
//     const selectedColor = selectedColors[product.id];
//     if (selectedColor) {
//       setSelectedColor(selectedColor);
//     } else {
//       setSelectedColor(colors[0]);
//       setSelectedColors(product.id, colors[0]);
//     }
//   }, [product, selectedColors, colors, setSelectedColors]);

//   return (
//     <div>
//       {showColorName && <Text className="mt-2">{selectedColor}</Text>}

//       <div
//         className="mt-2 flex items-center gap-1"
//         onClick={(e) => {
//           e.preventDefault();
//           e.stopPropagation();
//         }}
//       >
//         {Array.isArray(colors) &&
//           colors.map((color, index) => {
//             const isAvailable = isOptionAvailable(product, "color", color);

//             return (
//               <button
//                 key={index}
//                 onClick={() => {
//                   if (!isAvailable) return;
//                   setSelectedColor(color);

//                   setSelectedColors(product.id, color);
//                 }}
//                 className={cn(
//                   `flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-full border`,
//                   selectedColor === color && "border-slate-500",
//                   // : "border-[#DDDDDD]",
//                 )}
//                 style={{ backgroundColor: SWATCH_COLORS[color] }}
//                 aria-label={`Select color ${color}`}
//               >
//                 {selectedColor === color && (
//                   <CheckIcon
//                     fill={selectedColor === "black" ? "#DDDDDD" : "#302A25"}
//                   />
//                 )}
//               </button>
//             );
//           })}
//       </div>
//     </div>
//   );
// };

// export default Colors;

// const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
//   <svg
//     width={14}
//     height={9}
//     fill="none"
//     xmlns="http://www.w3.org/2000/svg"
//     {...props}
//   >
//     <path
//       d="M12.947 1.214 5.37 8.79a.71.71 0 0 1-1.007 0L1.048 5.476A.712.712 0 0 1 2.055 4.47l2.812 2.812L11.942.208a.712.712 0 0 1 1.006 1.007v-.001Z"
//       // fill="#302A25"
//       fill={props.fill}
//     />
//   </svg>
// );
