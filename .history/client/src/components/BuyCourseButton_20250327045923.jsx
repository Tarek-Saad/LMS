import  { useEffect } from "react";
import { Button } from "./ui/button";
import { useCreateCheckoutSessionMutation } from "@/features/api/purchaseApi";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";



// success , message , sessionID , success_url , cancel_url

// eslint-disable-next-line react/prop-types
const BuyCourseButton = ({ courseId }) => {
  const [sessionID, setSessionID] = useState(""); // حالة لتخزين sessionID
  const [isSessionInputVisible, setIsSessionInputVisible] = useState(false); // حالة لإظهار أو إخفاء مربع الإدخال

  const [createCheckoutSession, { data, isLoading, isSuccess, isError, error }] =
    useCreateCheckoutSessionMutation();

    let response;

  const purchaseCourseHandler = async () => {
    // إذا كان الـ sessionID فارغًا أو غير صحيح، نعرض رسالة خطأ
    if (!sessionID) {
      toast.error("Please provide a session ID.");
      return;
    }

    response = await createCheckoutSession(courseId, sessionID);
    console.log(response); // تسجيل الاستجابة من الـ API
    console.log(response.data.message); // تسجيل الاستجابة من الـ API
  };

  useEffect(() => {
    if (isSuccess) {
      if (data?.url) {
        window.location.href = data.url; // إعادة توجيه المستخدم إلى رابط الدفع
      } else {
        toast.error(response?.data?.message);
      }
    }
    if (isError) {
      toast.error(error?.data?.message || "Failed to create checkout session");
    }
  }, [data, isSuccess, isError, error]);

  return (
    <div>
      {/* عرض مربع الإدخال للـ sessionID إذا كانت حالة isSessionInputVisible هي true */}
      {isSessionInputVisible && (
        <div className="mb-4">
          <label htmlFor="sessionID" className="block text-sm font-medium">
            Enter Session ID
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded text-black"
            id="sessionID"
            name="sessionID"
            value={sessionID}
            onChange={(e) => setSessionID(e.target.value)}
            placeholder="Enter your session ID"
          />
        </div>
      )}

      <Button
        disabled={isLoading}
        onClick={() => {
          // إذا كانت حالة الإدخال غير مرئية، نعرض مربع الإدخال
          if (!isSessionInputVisible) {
            setIsSessionInputVisible(true);
          } else {
            // إذا كانت حالة الإدخال مرئية، نقوم بتقديم الطلب
            purchaseCourseHandler();
          }
        }}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Please wait
          </>
        ) : (
          isSessionInputVisible ? "Submit Session ID" : "Purchase Course"
        )}
      </Button>
    </div>
  );
};

export default BuyCourseButton;