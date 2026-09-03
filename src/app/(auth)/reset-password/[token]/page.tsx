"use client";

import React, { use } from "react";
import ResetPasswordPage from "../page";

export default function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  // Render the existing ResetPasswordPage, passing the token via query parameter compatibility or state
  return <ResetPasswordPage directToken={token} />;
}
