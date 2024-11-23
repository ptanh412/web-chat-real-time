const express = require('express');
const router = express.Router();
const conservationController = require('../controllers/conservationController');
const auth = require('../middlewares/auth');

router.post('/', auth, conservationController.createConservation);
router.get('/', auth, conservationController.getUserConservations);
router.get('/:conversationId', auth, conservationController.getConservation);
router.put('/:conversationId/add-participants', auth, conservationController.addParticipants);
router.put('/:conversationId/remove-participants', auth, conservationController.removeParticipants);
router.put('/:conversationId', auth, conservationController.updateConversation);
router.delete('/:conversationId', auth, conservationController.deleteConversation);

module.exports = router;