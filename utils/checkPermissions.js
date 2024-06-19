const CustomError = require('../errors')


const checkPermissions = (requestUser, resourceUserId) => {
    // console.log(requestUser);
    // console.log(resourceUserId);
    // console.log( typeof resourceUserId)
    if (requestUser.role === 'admin') return;
    if (requestUser.userId === resourceUserId.toString()) return
    throw new CustomError.UnauthenticatedError('Not Autorised to access this account')
}
module.exports = checkPermissions ;