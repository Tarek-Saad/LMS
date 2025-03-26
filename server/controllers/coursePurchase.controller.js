import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async(req, res) => {
    try {
        const userId = req.id;
        const { courseId } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found!" });

        // Create a new course purchase record
        const newPurchase = new CoursePurchase({
            courseId,
            userId,
            amount: course.coursePrice,
            status: "pending",
        });


        // We simulate creating a payment code (sessionID) - this can be more dynamic later on
        const sessionID = 1545; // This is a placeholder for the payment code

        // Save the purchase record
        newPurchase.paymentId = sessionID;
        await newPurchase.save();

        return res.status(200).json({
            success: true,
            message: "Payment is pending. Please provide the payment code once paid via WhatsApp.",
            sessionID, // Return the sessionID which represents the payment code
            success_url: `http://localhost:5173/course-progress/${courseId}`, // Redirect to course progress page after successful payment
            cancel_url: `http://localhost:5173/course-detail/${courseId}`, // Redirect to course detail page if payment is cancelled
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const paymentWebhook = async(req, res) => {
    let event;

    try {
        // const sessionID = "MMM"; // This is a placeholder for the payment code
        const sessionID = req.body.sessionID;

        // التحقق من الـ sessionID (يمكنك تطويره ليتحقق من كود مختلف لكل كورس في المستقبل)
        if (sessionID !== "MMM") {
            return res.status(400).json({ message: "Invalid payment code" });
        }

        // نبحث عن عملية الدفع في قاعدة البيانات باستخدام الـ paymentID
        const purchase = await CoursePurchase.findOne({
            paymentId: sessionID,
        }).populate({ path: "courseId" });

        if (!purchase) {
            return res.status(404).json({ message: "Purchase not found" });
        }

        // إذا تم الدفع بنجاح، نقوم بتحديث حالة عملية الشراء
        purchase.status = "completed";

        // تفعيل المحاضرات في الكورس
        if (purchase.courseId && purchase.courseId.lectures.length > 0) {
            await Lecture.updateMany({ _id: { $in: purchase.courseId.lectures } }, { $set: { isPreviewFree: true } });
        }

        // حفظ التحديثات في سجل عملية الشراء
        await purchase.save();

        // تحديث المستخدم وإضافة الكورس إلى الدورات المسجلة له
        await User.findByIdAndUpdate(
            purchase.userId, { $addToSet: { enrolledCourses: purchase.courseId._id } }, { new: true }
        );

        // إضافة المستخدم إلى قائمة الطلاب المسجلين في الكورس
        await Course.findByIdAndUpdate(
            purchase.courseId._id, { $addToSet: { enrolledStudents: purchase.userId } }, { new: true }
        );

        res.status(200).send("Payment processed successfully.");
    } catch (error) {
        console.error("Error handling payment:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getCourseDetailWithPurchaseStatus = async(req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.id;

        const course = await Course.findById(courseId)
            .populate({ path: "creator" })
            .populate({ path: "lectures" });

        const purchased = await CoursePurchase.findOne({ userId, courseId });
        console.log(purchased);

        if (!course) {
            return res.status(404).json({ message: "course not found!" });
        }

        return res.status(200).json({
            course,
            purchased: purchased?.status === 'completed' ? true : false, // true if purchased.status is 'completed', false otherwise
        });
        
    } catch (error) {
        console.log(error);
    }
};

export const getAllPurchasedCourse = async(_, res) => {
    try {
        const purchasedCourse = await CoursePurchase.find({
            status: "completed",
        }).populate("courseId");
        if (!purchasedCourse) {
            return res.status(404).json({
                purchasedCourse: [],
            });
        }
        return res.status(200).json({
            purchasedCourse,
        });
    } catch (error) {
        console.log(error);
    }
};