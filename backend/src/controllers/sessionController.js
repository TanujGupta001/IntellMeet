import { chatClient, streamClient } from "../lib/stream.js";
import Session from "../models/Session.js";

export async function createSession(req, res) {
  try {
    const { topic, teamId, participantClerkIds = [] } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }

    // Members must already exist in Stream (they were upserted via the Clerk webhook)
    const allMemberIds = Array.from(new Set([clerkId, ...participantClerkIds]));

    // generate a unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // create session in db
    const session = await Session.create({ topic, host: userId, callId });

    // create stream video call
    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { topic, sessionId: session._id.toString() },
      },
    });

    // chat messaging
    const channel = chatClient.channel("messaging", callId, {
      name: `${topic} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.log("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate({
        path: "host",
        select: "name profileImage email clerkId",
      })
      .populate({
        path: "participants",
        select: "name profileImage email clerkId",
      })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("❌ Error in getActiveSessions:", error); // FULL ERROR
    res.status(500).json({ message: error.message });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .populate({
        path: "host",
        select: "name profileImage email clerkId",
      })
      .populate({
        path: "participant",
        select: "name profileImage email clerkId",
      })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("❌ Error in getMyRecentSessions:", error);
    res.status(500).json({ message: error.message });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(400).json({ message: "Host cannot join their own session as participant" });
    }

 
    if (!session.participants.includes(clerkId)) 
      session.participants.push(clerkId);
      await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);
    
    if (session.status === "active") {
 
    // Kick off server-side transcription as soon as the meeting goes live.
    // Stream uploads the full transcript file once the call ends (see
    // the call.transcription_ready webhook handled in webhook.controller.js).
    try {
      await call.startTranscription({ language: "en" });
    } catch (err) {
      // Don't block the join if transcription fails to start — log and continue.
      console.error(`Failed to start transcription for ${session.callId}: ${err.message}`);
    }
  }

    await session.save();
    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId);

  // Stop transcription explicitly before ending — Stream uploads the
  // complete JSONL transcript file only once, after this call resolves,
  // and dispatches it via the call.transcription_ready webhook.
  try {
    await call.stopTranscription();
  } catch (err) {
    console.error(`Failed to stop transcription for ${session.callId}: ${err.message}`);
  }

    await call.delete({ hard: true });

    // delete stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
