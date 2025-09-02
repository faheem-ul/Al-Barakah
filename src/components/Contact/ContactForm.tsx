"use client"
import React, { useState } from "react";
import Image from "next/image";
import Phone from "@/public/images/contactus/phone.png";
import fb from "@/public/images/contactus/fb.png";
import insta from "@/public/images/contactus/insta.png";
import tiktok from "@/public/images/contactus/tiktok.png";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset form to empty values
    setFormData({
      name: "",
      email: "",
      message: ""
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  return (
    <section className="relative -mt-42 z-20 px-4">
      <div className="w-full">
        <div className="bg-black rounded-[40px] px-10 py-12 shadow-2xl">
          <div className="mob:flex-wrap flex items-center gap-12">
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
                <h2 className="text-[36px] font-bold text-white mb-2">Ask Us Anything</h2>
                <p className="text-white text-[16px] font-light leading-relaxed">
                  Our Mission Is Simple: To Bring The Freshest, Most Purest Honey Produce 
                  Directly From Our Hives To Your Home.
                </p>
              </div>
              
              <div className="space-y-4 pt-1">
                <ContactItem
                  icon={<Image src={Phone} alt="Phone" width={24} height={24} />}
                  text="+92 304 1980001"
                />
                <ContactItem
                  icon={<Image src={fb} alt="Facebook" width={24} height={24} />}
                  text="Albaraka Honey"
                />
                <ContactItem
                  icon={<Image src={insta} alt="Instagram" width={24} height={24} />}
                  text="The AlBaraka honey "
                />
                <ContactItem
                  icon={<Image src={tiktok} alt="TikTok" width={24} height={24} />}
                  text="Albaraka Honey 713"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ContactItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => {
  return (
    <div className="flex items-center space-x-3">
      <div className="">
        {icon}
      </div>
      <span className="text-white text-[18px] font-medium">{text}</span>
    </div>
  );
};

export default ContactForm;
