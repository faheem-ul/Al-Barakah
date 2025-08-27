"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function processGoldenTicket(formData: FormData) {
  const goldenTicketWord = formData.get("goldenTicket") as string;

  if (!goldenTicketWord || goldenTicketWord.trim() === "") {
    redirect("/upcoming");
  }

  const tickedWords = [
    "EarlyCapsule2025",
    "BFF",
    "WIN",
    "FIT",
    "SUN",
    "ZEN",
    "JOY",
    "FUN",
    "GLO",
    "YOU",
    "POP",
  ];

  const isValid = tickedWords.includes(goldenTicketWord);
  // const isValid = goldenTicketWord === "EarlyCapsule2025";

  if (isValid) {
    // if (true) {
    const cookieStore = await cookies();

    cookieStore.set({
      name: "goldenTicket",
      value: goldenTicketWord,
      httpOnly: true,
      path: "/",
      //   maxAge: 60 * 60 * 24, // 1 day
    });

    console.log("Cookie setup with golden Ticket Word: ", goldenTicketWord);

    redirect("/");
  } else {
    // redirect("/upcoming"); // client can pick this up on reload
    redirect("/upcoming?error=invalid");
  }
}
