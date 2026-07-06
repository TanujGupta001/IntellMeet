const mongoose = require("mongoose");


const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    admin: {
      type: String, // clerkId of the team creator/admin
      required: true,
    },
    members: [
      {
        type: String, // clerkIds
      },
    ],
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);