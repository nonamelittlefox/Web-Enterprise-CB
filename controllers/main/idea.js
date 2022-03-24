const Idea = require("../../models/idea");
const User = require("../../models/user");
const UserRole = require("../../models/userRole");
const Role = require("../../models/role");
const Category = require("../../models/category")
const Comment = require("../../models/comment")
const sendEmail = require("../../middleware/nodemailer")
require('dotenv').config();

const getPath = (path) => {
    return process.env.BASE_URL + "/" + path[path.length - 2] + "/" + path[path.length - 1];
};
// /api/list-baiviet?limit=5&page=2&filter=like&sort=desc&q=
module.exports = {
    getIdea: async (ctx) => {
        let page = ctx.query.page;
        // let filter = ctx.query.filter;
        const pageSize = 5;
        if (page) {
            page = parseInt(page)
            const skip = (page - 1) * pageSize;
            const idea = await Idea.find({}).skip(skip).limit(pageSize).populate("user").sort("DESC").lean();
            const totalPage = parseInt(idea.length / 5);
            const totalRecord = idea.length
            return (ctx.body = {
                status: true,
                message: "get idea success",
                data: {
                    page,
                    totalPage,
                    totalRecord,
                    idea
                }
            })
        }
        const idea = await Idea.find({}).lean();
        return (ctx.body = {
            status: true,
            message: "get idea success",
            data: {
                idea
            }
        })

    },

    getIdeaComment: async (ctx) => {
        const ideaId = ctx.params.id
        if (!ideaId) {
            return (ctx.body = {
                status: false,
                message: "id not found",
            })
        }
        const idea = await Idea.findOne({
            _id: ideaId
        }).lean();
        const comments = await Comment.find({
            idea: ideaId
        }).sort({
            createdAt: 'DESC'
        }).lean();

        if (!idea) {
            return (ctx.body = {
                status: false,
                message: "idea not found",
            })
        }

        return (ctx.body = {
            status: true,
            message: "get idea and comments success",
            data: {
                idea,
                comments
            }
        })
    },


    createIdea: async (ctx) => {
        const idea = new Idea(ctx.request.body);
        const category = ctx.request.body.category;
        const thisCategory = await Category.findOne({
            _id: category
        }).select("isDisabled");
        if (thisCategory.isDisabled === true) {
            return (ctx.body = {
                status: false,
                message: "this category has been disabled"
            })
        }

        for (let i = 0; i < ctx.request.files.ideaFile.length; i++) {
            let ideaFilePath = ctx.request.files.ideaFile[i].path.split("\\");
            idea.ideaFile[i] = getPath(ideaFilePath);
        }
        const user = ctx.state.user;
        idea.user = user.user._id
        idea.department = user.department._id
        await idea.save();

        const role = await Role.findOne({
            roleName: "Quality Assurance Coordinator"
        }).lean();
        const userRole = await UserRole.findOne({
            user: user.user._id
        }).lean();
        const QAC = await UserRole.findOne({
            role: role._id,
            department: userRole.department
        }).populate("user", "email").lean();
        sendEmail({
            to: QAC.user.email,
            subject: "New idea",
            html: '<p>New Idea of your department has been added</p>',
        })
        return (ctx.body = {
            status: true,
            message: "create idea success"
        })
    },

    updateIdea: async (ctx) => {
        const id = ctx.params.id;
        const {
            ideaContent
        } = ctx.request.body
        const user = ctx.state.user
        const idea = await Idea.findOne({
            _id: id
        }).lean()
        if (!idea) {
            return (ctx.body = {
                status: false,
                message: "no idea found",
            });
        }
        if (idea.user.toString() !== user.user._id.toString()) {
            return (ctx.body = {
                status: false,
                message: "cannot change others' idea",
            });
        }
        await Idea.updateOne({
            _id: id
        }, {
            ideaContent: ideaContent,
        });
        return (ctx.body = {
            status: true,
            message: "update idea success",
        });
    },

    deleteIdea: async (ctx) => {
        const id = ctx.params.id;
        const user = ctx.state.user
        if (!id || id === undefined) {
            return (ctx.body = {
                status: false,
                message: "id not found"
            })
        }
        const idea = await Idea.findOne({
            _id: id
        }).lean()
        if (idea.user.toString() !== user.user._id.toString()) {
            return (ctx.body = {
                status: false,
                message: "cannot delete others' idea",
            });
        }
        const deleteIdea = await Idea.deleteOne({
            _id: id
        })

        if (deleteIdea.deletedCount === 0) {
            return (ctx.body = {
                status: false,
                message: 'no idea found to delete',
            });
        }

        return (ctx.body = {
            status: true,
            message: "delete idea success",
        });
    },

    agreeTerm: async (ctx) => {
        const isAgreedTerm = ctx.request.body.isAgreedTerm;
        const user = ctx.state.user
        console.log(isAgreedTerm)
        if (isAgreedTerm === 'true') {
            await User.updateOne({
                _id: user.user._id
            }, {
                isAgreedTerm: true
            });
            return (ctx.body = {
                status: true,
                message: "user agreed term",
            });
        }

        return (ctx.body = {
            status: false,
            message: "user not agreed term",
        });
    },
}