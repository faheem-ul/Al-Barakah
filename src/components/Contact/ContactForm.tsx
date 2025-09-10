"use client";
import React, { useState } from "react";
import Image from "next/image";
import { BsTwitterX } from "react-icons/bs";
import {
  FaLinkedinIn,
  FaPinterestP,
  FaFacebookF,
  FaInstagram,
} from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import { AiOutlineYoutube } from "react-icons/ai";
import { AiOutlinePhone } from "react-icons/ai";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset form to empty values
    setFormData({
      name: "",
      email: "",
      message: "",
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  return (
    <section className="relative -mt-42 z-20 px-4">
      <div className="w-full">
        <div className="bg-black rounded-[40px] px-4 md:px-10 py-12 shadow-2xl">
          <div className="flex-wrap md:flex-nowrap flex items-center gap-8 md:gap-12">
            {/* Contact Form */}
            <div className="space-y-8 w-full max-w-[589px]">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-6 h-[53px] text-[16px] font-normal font-poppins bg-[#D3D3D340] text-white placeholder-white/50 rounded-[60px] border-[0.5px] border-white/50 focus:border-white focus:outline-none "
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="E-mail Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-6 h-[53px] text-[16px] font-normal font-poppins bg-[#D3D3D340] text-white placeholder-white/50 rounded-[60px] border-[0.5px] border-white/50 focus:border-white focus:outline-none "
                  />
                </div>

                <div>
                  <textarea
                    name="message"
                    placeholder="Your Message"
                    rows={7}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-[#D3D3D340] text-white placeholder-white/50 rounded-[25px] border-[0.5px] border-white/50 focus:border-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-[20px] text-black font-semibold py-2 px-8 rounded-[30px] hover:bg-gray-100 "
                >
                  Submit
                </button>
              </form>
            </div>

            {/* Ask Us Anything */}
            <div className="space-y-4 max-w-[455px]">
              <div>
                <h2 className="md:text-[36px] md:leading-[40px] text-[30px] leading-[35px] font-bold text-white mb-2">
                  Ask Us Anything
                </h2>
                <p className="text-white text-[16px] font-light leading-relaxed">
                  Our Mission Is Simple: To Bring The Freshest, Most Purest
                  Honey Produce Directly From Our Hives To Your Home.
                </p>
              </div>

              <div className="">
                <ContactItem
                  href="tel:+92 306 2141972"
                  icon={<AiOutlinePhone className="text-black" size={18} />}
                  boxed
                  text="+92 306 2141972"
                />
                <ContactItem
                  href="https://www.facebook.com/profile.php?id=61579862667667"
                  icon={<FaFacebookF className="text-black" size={16} />}
                  text="Albaraka Honey"
                  boxed
                />
                <ContactItem
                  href="https://www.instagram.com/thealbarakahoney/"
                  icon={<FaInstagram className="text-black" size={16} />}
                  text="The AlBaraka honey "
                  boxed
                />
                <ContactItem
                  href="https://www.tiktok.com/@albarakahoney713"
                  icon={<FaTiktok className="text-black" size={16} />}
                  text="Albaraka Honey 713"
                  boxed
                />
                <ContactItem
                  href="https://x.com/thalbarakahoney"
                  icon={<BsTwitterX className="text-black" size={16} />}
                  text="Albaraka Honey X (Twitter)"
                  boxed
                />
                <ContactItem
                  href="https://www.linkedin.com/feed/update/urn:li:activity:7370850743056150528/"
                  icon={<FaLinkedinIn className="text-black" />}
                  text="LinkedIn"
                  boxed
                />
                <ContactItem
                  href="https://www.youtube.com/shorts/D_9vJoxm26s"
                  icon={<AiOutlineYoutube className="text-black" />}
                  text="YouTube"
                  boxed
                />
                <ContactItem
                  href="https://www.tiktok.com/@albarakahoney713"
                  icon={<FaPinterestP className="text-black" />}
                  text="Pinterest"
                  boxed
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ContactItem = ({
  icon,
  text,
  href,
  boxed = false,
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
  boxed?: boolean;
}) => {
  return (
    <a href={href} className="">
      <div className="flex items-center space-x-3 mb-4">
        <div
          className={
            boxed
              ? "bg-white rounded-[6px] w-[30px] h-[30px] flex items-center justify-center"
              : ""
          }
        >
          {icon}
        </div>
        <span className="text-white text-[18px] font-medium">{text}</span>
      </div>
    </a>
  );
};

export default ContactForm;
