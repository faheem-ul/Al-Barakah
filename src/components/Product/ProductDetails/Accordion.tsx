"use client";

import React, { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PropTypes {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ProductAccordion = (props: PropTypes) => {
  const { title, children } = props;

  const [isOpen, setIsOpen] = useState(true);
  const handleToggle = () => setIsOpen((prev) => !prev);

  return (
    <Accordion type="single" collapsible value={isOpen ? "item-1" : "item-2"}>
      <AccordionItem value="item-1" onClick={handleToggle}>
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent onClick={(e) => e.stopPropagation()}>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProductAccordion;
