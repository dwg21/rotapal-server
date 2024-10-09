//Creates an object contianing users details to be attached onto token
const createTokenUser = (user) => {
  console.log(user);
  return {
    name: user.name,
    userId: user._id,
    role: user.role,
    business: user.business,
  };
};

module.exports = createTokenUser;
