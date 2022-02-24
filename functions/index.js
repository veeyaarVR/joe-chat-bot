// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require("firebase-functions");
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(
  (request, response) => {
    console.log("Request headers: " + JSON.stringify(request.headers));
    console.log("Request body: " + JSON.stringify(request.body));
    const action = request.body.queryResult.action;
    const queryText = request.body.queryResult.queryText;
    const outputContexts = request.body.queryResult.outputContexts;
    // const sessionId = request.body.session.split("/").reverse()[0];

    switch (action) {
      case "req.userSelectsOption":
        checkSessionValue();
        break;
      case "ask.MembershipID":
        validateMembershipID();
        break;
      case "ask.DateOfBirth":
        checkForDateOfBirth();
        break;
      case "askMembershipID.askMembershipID-custom.askDateOfBirth-custom":
        validateLastName();
        break;
      case "req.action":
        sendResponse("Please enter your membership ID");
        break;
      default:
        sendResponse("Unknown action");
    }

    function checkSessionValue() {
      sendResponse("Please enter your membership ID");
    }

    function validateMembershipID() {
      const membershipId = fetchMembershipIdFromRequest();
      admin
        .firestore()
        .collection("users")
        .where("Member ID", "==", membershipId)
        .limit(1)
        .get()
        .then((snapshot) => {
          const user = snapshot.docs[0];
          if (!user) {
            sendResponse(
              "Invalid Member ID. Please try again."
            );
          } else {
            sendResponse(
              "Member ID validation successful. Please mention your Date of Birth in DD/MM/YYY format"
            );
          }
        });
    }

    function fetchMembershipIdFromRequest() {
      let membershipID = "";
      outputContexts.forEach((item, index) => {
        const contextName = item.name.split("/").reverse()[0];
        if (contextName === "ask-membership-id") {
          const id = item.parameters.membershipID;
          console.log("parameters -->" + JSON.stringify(item));
          console.log("parameter -->" + JSON.stringify(item));
          if (!id) {
            membershipID = "";
          } else {
            membershipID = id;
          }
        }
      });
      return membershipID;
    }

    function checkForDateOfBirth() {
      const userId = fetchMembershipIdFromRequest();

      admin
        .firestore()
        .collection("users")
        .where("Member ID", "==", userId)
        .limit(1)
        .get()
        .then((snapshot) => {
          const user = snapshot.docs[0];
          if (!user) {
            sendResponse("Invalid Member ID");
          } else {
            const storedDob = user.get("BIRTHDATE");
            if (queryText === storedDob) {
              sendResponse(
                "DOB validated successfully. Please enter your Last Name"
              );
            } else {
              sendResponse(
                "Date of Birth Validation Failed. Please try again."
              );
            }
          }
        });
    }

    function validateLastName() {
      const userId = fetchMembershipIdFromRequest();
      admin
        .firestore()
        .collection("users")
        .where("Member ID", "==", userId)
        .limit(1)
        .get()
        .then((snapshot) => {
          const user = snapshot.docs[0];
          if (!user) {
            sendResponse("User Validation Failed");
          } else {
            const storedLastName = user.get("MEMBER_LAST_NAME");
            if (queryText === storedLastName) {
              console.log("came here 1");
              user.ref
                .collection("claimDetails")
                .get()
                .then((snapshot) => {
                  console.log("came here 3");
                  const claimDetails = snapshot.docs;
                  if (!claimDetails) {
                    sendResponse("no user");
                  } else {
                    returnResponseBasedOnOption({claimDetails: claimDetails});
                  }
                })
                .catch((error) => {
                  console.log("came here 3 error : " + error.message);
                });
            } else {
              sendResponse(
                "Last Name Validation Failed. Please try again."
              );
            }
          }
        });
    }

    function returnResponseBasedOnOption({claimDetails}) {
      const selectedOption = fetchSelectedOption();
      switch (selectedOption) {
        case "service date": {
          combineAndSendResponse({claimDetails: claimDetails});
          break;
        }
        case "procedure code": {
          combineAndSendResponse({claimDetails: claimDetails});
          break;
        }
        case "total claim": {
          combineAndSendResponse({claimDetails: claimDetails});
          break;
        }
        case "total bt provider": {
          combineAndSendResponse({claimDetails: claimDetails});
          break;
        }
        case "total bt benefit": {
          combineAndSendResponse({claimDetails: claimDetails});
          break;
        }
        case "member copayment": {
          combineAndSendResponse({claimDetails: claimDetails});
          break;
        }
        default:
          sendResponse(
            "You have selected a wrong option."
          );
      }
    }

    function combineAndSendResponse({claimDetails}) {
      let finalString = "";

      // service date
      finalString += "Your service date is ";
      claimDetails.forEach((item, index) => {
        const label = index + 1;
        finalString += label + ") " + item.get("SERVICE_DATE") + "  ";
      });
      finalString += "\n";

      // procedure code
      finalString += "Your Submitted Procedure Code is ";
      claimDetails.forEach((item, index) => {
        const label = index + 1;
        finalString +=
          label + ") " + item.get("SUBMITTED_PROCEDURE_CODE") + "  ";
      });
      finalString += "\n";

      // total claim charge
      finalString += "Your total claim charge is ";
      claimDetails.forEach((item, index) => {
        const label = index + 1;
        finalString += label + ") " + item.get("TOTAL_CLAIM_CHARGE") + "  ";
      });
      finalString += "\n";

      // total bt provider
      finalString += "Your Total BT Provider Eligible is ";
      claimDetails.forEach((item, index) => {
        const label = index + 1;
        finalString +=
          label + ") " + item.get("TOTAL_BT_PROVIDER_ELIGIBLE") + "  ";
      });
      finalString += "\n";

      // total bt benefits
      finalString += "Your Total BT Benefit Reimbursement is ";
      claimDetails.forEach((item, index) => {
        const label = index + 1;
        finalString +=
          label + ") " + item.get("TOTAL_BT_BENEFIT_REIMBURSEMENT") + "  ";
      });
      finalString += "\n";

      // member copayment
      finalString += "Your Member Copayment Amount is ";
      claimDetails.forEach((item, index) => {
        const label = index + 1;
        finalString +=
          label + ") " + item.get("MEMBER_COPAYMENT_AMOUNT") + "  ";
      });
      finalString += "\n";

      sendResponse(finalString);
    }

    function fetchSelectedOption() {
      let selectedOption = "";
      outputContexts.forEach((item, index) => {
        const contextName = item.name.split("/").reverse()[0];
        if (contextName === "ask-membership-id") {
          const id = item.parameters.txtInput;
          if (!id) {
            selectedOption = "";
          } else {
            selectedOption = id;
          }
        }
      });
      return selectedOption;
    }

    function sendResponse(responseToUser) {
      const responseJson = {};
      responseJson.fulfillmentText = responseToUser; // displayed response
      response.json(responseJson);
    }
  }
);
