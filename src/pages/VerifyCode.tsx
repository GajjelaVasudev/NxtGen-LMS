import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/FormInput";

export default function VerifyCode() {
  const [code, setCode] = useState("7789BM6X");

  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full lg:w-1/2 px-6 md:px-16 lg:px-26 py-12 flex flex-col">
        <Logo />
        
        <div className="flex-1 flex items-center justify-center max-w-[512px] mx-auto w-full">
          <div className="w-full flex flex-col gap-12">
            <div className="flex flex-col gap-4">
              <Link
                to="/login"
                className="flex items-center gap-1 text-[#313131] font-poppins text-sm font-medium hover:underline w-fit"
              >
                <ChevronLeft className="w-6 h-6" />
                Back to login
              </Link>

              <div className="flex flex-col gap-4">
                <h1 className="text-[#313131] font-poppins text-[40px] font-bold leading-normal">
                  Verify code
                </h1>
                <p className="text-[#313131] font-poppins text-base opacity-75">
                  An authentication code has been sent to your email.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <FormInput
                  label="Enter Code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                
                <p className="text-sm font-poppins">
                  <span className="text-[#313131]">Didn't receive a code?</span>{" "}
                  <button className="text-[#FF8682] font-bold hover:underline">
                    Resend
                  </button>
                </p>
              </div>

              <button className="w-full h-12 bg-[#515DEF] rounded flex items-center justify-center text-[#F3F3F3] font-poppins text-sm font-bold hover:bg-[#515DEF]/90 transition-colors">
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16">
        <div className="relative w-full max-w-[616px] h-[816px]">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/b820ad2017d7d203a4deec4eadd084406580c913?width=1232"
            alt="Verify code illustration"
            className="w-full h-full object-cover rounded-[30px]"
          />
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-start gap-2">
            <div className="w-8 h-2.5 rounded-full bg-[#8DD3BB]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
