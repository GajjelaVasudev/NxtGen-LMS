import { useState } from "react";
import { Logo } from "@/components/Logo";
import { FormInput } from "@/components/FormInput";

export default function SetPassword() {
  const [newPassword, setNewPassword] = useState("7789BM6X@@H&$K_");
  const [confirmPassword, setConfirmPassword] = useState("7789BM6X@@H&$K_");

  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full lg:w-1/2 px-6 md:px-16 lg:px-26 py-12 flex flex-col">
        <Logo />
        
        <div className="flex-1 flex items-center justify-center max-w-[512px] mx-auto w-full">
          <div className="w-full flex flex-col gap-12">
            <div className="flex flex-col gap-4">
              <h1 className="text-[#313131] font-poppins text-[40px] font-bold leading-normal">
                Set a password
              </h1>
              <p className="text-[#313131] font-poppins text-base opacity-75">
                Your previous password has been reseted. Please set a new password for your account.
              </p>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <FormInput
                  label="Create Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <FormInput
                  label="Re-enter Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button className="w-full h-12 bg-[#515DEF] rounded flex items-center justify-center text-[#F3F3F3] font-poppins text-sm font-bold hover:bg-[#515DEF]/90 transition-colors">
                Set password
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16">
        <div className="relative w-full max-w-[616px] h-[816px]">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/4e2fa4fb1fe26550f221baa6e42662466759d1c0?width=1232"
            alt="Set password illustration"
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
