import { sequelize } from "../config/sequelize";
import { User } from "../models/User";
import bcrypt from "bcryptjs";

export const ensureAdminUser = async () => {
  try {
    await sequelize.authenticate();
    const email = "pinky@example.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Ensuring user ${email} exists and is admin...`);

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    if (user) {
      console.log("User found. Updating password and role...");
      user.password = hashedPassword;
      user.role = "admin";
      await user.save();
      console.log("User updated successfully.");
    } else {
      console.log("User not found. Creating...");
      await User.create({
        email,
        password: hashedPassword,
        first_name: "Pinky",
        last_name: "Princess",
        role: "admin",
        address: "123 Main St", // Basic string for now, or JSON string if schema requires
        phone: "+85512345678",
      } as any);
      console.log("User created successfully.");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// If executed directly, run and exit
if (require.main === module) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void (async () => {
    try {
      await ensureAdminUser();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}
