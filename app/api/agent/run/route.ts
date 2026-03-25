import { runAgent } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export async function POST() {

    const isAuto = process.env.AUTO_SECRET
    
    if (!isAuto) {
        // authentication

        const {userId: clerkId} = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: {
                clerkId
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        

        const result = await runAgent(user.id);

        return NextResponse.json({ error: "Auto secret not found" }, { status: 500 })
    }

    // auto job
    return NextResponse.json({ message: "Auto job started" }, { status: 200 })
}