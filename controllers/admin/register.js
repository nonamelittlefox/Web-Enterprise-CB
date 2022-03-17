const User = require("../../models/user");
const Role = require("../../models/role");
const UserRole = require("../../models/userRole");
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = {
  addRole: async (ctx) => {
    let { roleName } = ctx.request.body;
    if (!roleName || roleName === undefined) {
      return (ctx.body = {
        status: false,
        message: "No role to add",
      });
    }
    let role = new Role({ roleName: roleName });

    await role.save();
    return (ctx.body = {
      status: true,
      message: "Role successfully created",
    });
  },

  getRole: async (ctx) => {
    const role = await Role.find({}).select("-__v").lean();
    return (ctx.body = {
      status: true,
      message: "Get all role success",
      role: role,
    });
  },

  deleteRole: async (ctx) => {
    let { id } = ctx.request.params;
    console.log(id);
    if (!id || id === undefined) {
      return (ctx.body = {
        status: false,
        message: "delete role failed",
      });
    }
    await Role.deleteOne({ _id: id });
    return (ctx.body = {
      status: true,
      message: "delete role success",
    });
  },

  register: async (ctx) => {
    let { username, email, password, roleId, name } = ctx.request.body;
    const existAccount = await User.findOne({
      username: username,
    });
    if (existAccount)
      return (ctx.body = {
        status: false,
        message: "Account existed",
      });
    else {
      let hash = bcrypt.hashSync(password, saltRounds);
      let user = new User({
        username: username,
        email: email,
        password: hash,
        name: name,
      });
      await user.save();
      let userRole = new UserRole({
        user: user._id,
        role: roleId,
      });
      await userRole.save();
      return (ctx.body = {
        status: true,
        message: "Account successfully created",
      });
    }
  },
};