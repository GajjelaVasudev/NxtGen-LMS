import React, { useState } from "react";

interface Props {
  courseId: string;
  courseTitle?: string;
  amount?: number; // in rupees or display currency
  onSuccess?: () => void;
  onCancel?: () => void;
  fullScreen?: boolean;
}

export default function MockPaymentGateway({ courseId, courseTitle, amount = 0, onSuccess, onCancel, fullScreen = false }: Props) {
  const [selectedOption, setSelectedOption] = useState<string>("UPI");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const completePayment = () => {
    if (processing) return;
    setProcessing(true);
    // Immediately show success message as requested
    setSuccess(true);

    // persist mock purchase
    try {
      const purchasesRaw = localStorage.getItem("nxt_purchases") || "{}";
      const purchases = JSON.parse(purchasesRaw || "{}");
      purchases[courseId] = { purchasedAt: new Date().toISOString(), title: courseTitle || "" };
      localStorage.setItem("nxt_purchases", JSON.stringify(purchases));
    } catch (e) {
      console.warn(e);
    }

    // small delay then call onSuccess and close
    setTimeout(() => {
      setProcessing(false);
      if (onSuccess) onSuccess();
    }, 900);
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block" />
              <h3 className="text-lg font-semibold">Demo Payment Checkout</h3>
            </div>
            <button onClick={onCancel} className="text-sm text-gray-600">Close</button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-sm text-gray-500">Course</div>
            <div className="text-xl font-medium">{courseTitle}</div>
            <div className="text-sm text-gray-500 mt-2">Amount</div>
            <div className="text-3xl font-bold">₹{amount}</div>

            <div className="mt-6">
              <div className="text-sm text-gray-600 mb-2">Payment options</div>
              <div className="flex gap-2">
                {["UPI", "Credit / Debit Card", "Net Banking"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedOption(opt)}
                    className={`px-3 py-2 rounded-md border ${selectedOption === opt ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-100">Cancel</button>
              <button onClick={completePayment} className="px-4 py-2 rounded-md bg-blue-600 text-white">Complete Payment</button>
            </div>

            {success && (
              <div className="mt-4 text-green-700 font-medium flex items-center gap-2">
                <span className="text-lg">✔</span>
                <span>Payment Successful — Course Unlocked</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onCancel} />

      <div className="bg-white rounded-2xl shadow-xl z-10 w-full max-w-lg p-6 transform transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block" />
            <h3 className="text-lg font-semibold">Demo Payment Checkout</h3>
          </div>
          <div className="text-sm text-gray-500">{courseTitle}</div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-500">Course</div>
          <div className="text-base font-medium">{courseTitle}</div>
          <div className="text-sm text-gray-500 mt-2">Amount</div>
          <div className="text-2xl font-bold">₹{amount}</div>
        </div>

        <div className="mt-5">
          <div className="text-sm text-gray-600 mb-2">Payment options</div>
          <div className="flex gap-2">
            {["UPI", "Credit / Debit Card", "Net Banking"].map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedOption(opt)}
                className={`px-3 py-2 rounded-md border ${selectedOption === opt ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-100">Cancel</button>
          <button onClick={completePayment} className="px-4 py-2 rounded-md bg-blue-600 text-white">Complete Payment</button>
        </div>

        {success && (
          <div className="mt-4 text-green-700 font-medium flex items-center gap-2">
            <span className="text-lg">✔</span>
            <span>Payment Successful — Course Unlocked</span>
          </div>
        )}
      </div>
    </div>
  );
}
