import "server-only";
// app/api/scan/deduct/route.ts

import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";



export async function POST(req: Request) {

  const body = await req.json();

  const { userId, type } = body;



  if (!userId || !type) {

    return NextResponse.json(

      { success: false, message: "Missing userId or type." },

      { status: 400 }

    );

  }



  // Connect to Supabase

  const supabase = createClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL!,

    process.env.SUPABASE_SERVICE_ROLE_KEY!

  );



  // Fetch the user

  const { data: account, error } = await supabase

    .from("user_accounts")

    .select("id, tier, scan_credits, doctor_credits")

    .eq("id", userId)

    .single();



  if (error || !account) {

    return NextResponse.json(

      { success: false, message: "User not found." },

      { status: 404 }

    );

  }



  // Membership rules

  const unlimited =

    account.tier === "pro" || account.tier === "ultimate";



  if (unlimited) {

    return NextResponse.json({

      success: true,

      message: "Unlimited tier — no credit deducted.",

    });

  }



  // Deduction logic

  if (type === "scan") {

    if ((account.scan_credits ?? 0) <= 0) {

      return NextResponse.json(

        {

          success: false,

          message: "No scan credits remaining.",

        },

        { status: 403 }

      );

    }



    await supabase

      .from("user_accounts")

      .update({

        scan_credits: (account.scan_credits ?? 0) - 1,

      })

      .eq("id", userId);



    return NextResponse.json({

      success: true,

      message: "Scan credit deducted.",

    });

  }



  if (type === "doctor") {

    if ((account.doctor_credits ?? 0) <= 0) {

      return NextResponse.json(

        {

          success: false,

          message: "No doctor credits remaining.",

        },

        { status: 403 }

      );

    }



    await supabase

      .from("user_accounts")

      .update({

        doctor_credits: (account.doctor_credits ?? 0) - 1,

      })

      .eq("id", userId);



    return NextResponse.json({

      success: true,

      message: "Doctor scan credit deducted.",

    });

  }



  return NextResponse.json(

    { success: false, message: "Invalid type parameter." },

    { status: 400 }

  );

}

