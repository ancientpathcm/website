import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlQVjJLpfut7af_o3FDL3trPIbAVdsfmE",
  authDomain: "youth-programs-apcm.firebaseapp.com",
  projectId: "youth-programs-apcm",
  storageBucket: "youth-programs-apcm.firebasestorage.app",
  messagingSenderId: "792736394614",
  appId: "1:792736394614:web:b9ff25f5a179c2bfc5de57"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const formLoadedAt = new Date();

function setStatus(message, type) {
  if (!formStatus) return;

  formStatus.textContent = message;
  formStatus.dataset.status = type;
}

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector("button[type='submit']");
    const formData = new FormData(contactForm);
    const honeypot = String(formData.get("website") || "").trim();

    if (honeypot) {
      contactForm.reset();
      setStatus("Message sent. Thank you for reaching out.", "success");
      return;
    }

    const submission = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      organization: String(formData.get("organization") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      source: "website-contact-form",
      website: "ancientpathcm.org",
      formLoadedAtClient: Timestamp.fromDate(formLoadedAt),
      submittedAtClient: Timestamp.fromDate(new Date()),
      createdAt: serverTimestamp()
    };

    if (!submission.name || !submission.email || !submission.message) {
      setStatus("Please complete the required fields.", "error");
      return;
    }

    if (submission.message.length < 10) {
      setStatus("Please include a little more detail in your message.", "error");
      return;
    }

    submitButton.disabled = true;
    setStatus("Sending message...", "pending");

    try {
      await addDoc(collection(db, "contactSubmissions"), submission);
      contactForm.reset();
      setStatus("Message sent. Thank you for reaching out.", "success");
    } catch (error) {
      console.error("Contact form submission failed:", error);
      setStatus(
        "Message could not be sent. Please email info@ancientpathcm.org directly.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
    }
  });
}
