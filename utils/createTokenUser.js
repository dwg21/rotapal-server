//Creates an object contianing users details to be attached onto token
const createTokenUser = (user) => {
  return { name: user.name, userId: user._id, role: user.role };
};

module.exports = createTokenUser;
