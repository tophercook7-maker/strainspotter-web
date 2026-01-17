// ScannerController.tsx

"use client";



import { useState } from "react";



interface ScannerControllerProps {

  userId: string;

  ScannerComponent?: React.ComponentType<{ onComplete: (result: any) => void }>;

}



export default function ScannerController({ userId, ScannerComponent }: ScannerControllerProps) {

  const [status, setStatus] = useState<"idle" | "checking" | "ready" | "error">(

    "idle"

  );

  const [error, setError] = useState("");



  // STEP 1 — CHECK CREDITS BEFORE SHOWING SCANNER

  async function handleStartScan() {

    setStatus("checking");

    setError("");



    try {

      const res = await fetch(`/api/scan/check?user=${userId}`);

      const data = await res.json();



      if (!data.allowed) {

        setStatus("error");

        setError(data.message || "Not enough credits.");

        return;

      }



      setStatus("ready"); // allowed to scan

    } catch (err) {

      setStatus("error");

      setError("Failed to check credits. Please try again.");

    }

  }



  // STEP 2 — DEDUCT CREDIT AFTER A SUCCESSFUL SCAN

  async function deductCredit(type = "scan") {

    try {

      const res = await fetch("/api/scan/deduct", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({ userId, type }),

      });



      const data = await res.json();

      if (!data.success) {

        console.error("Failed to deduct credit:", data.message);

      }

    } catch (err) {

      console.error("Error deducting credit:", err);

    }

  }



  // STEP 3 — CALL DEDUCT AFTER SCANNER RETURNS A RESULT

  async function handleScanComplete(result: any) {

    await deductCredit("scan");

    console.log("Scan completed:", result);

  }



  return (

    <div className="scanner-wrapper">

      {status === "idle" && (

        <button onClick={handleStartScan} className="btn-primary">

          Start Scan

        </button>

      )}



      {status === "checking" && <p>Checking credits…</p>}



      {status === "error" && <p className="text-red">{error}</p>}



      {status === "ready" && ScannerComponent && (

        <ScannerComponent onComplete={handleScanComplete} />

      )}

    </div>

  );

}

