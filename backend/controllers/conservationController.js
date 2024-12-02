const conservationService = require('../services/conservationService');

const createConservation = async (req, res) =>{
    try {
        const {type, participants, name} = req.body;
        const creator = req.user._id;
        const conservation = await conservationService.createConservation({type, participants, creator, name});
        res.status(201).json({message: 'Conservation created', conservation});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

const getUserConservations = async (req, res) =>{
    try {
        const userId = req.user._id;
        const conservations = await conservationService.getConservations(userId);
        res.status(200).json({message: 'Conservations fetched', conservations});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

const getConservation = async (req, res) =>{
    try {
        const {conversationId} = req.params;
        const conservation = await conservationService.getConservationsById(conversationId);
        if(!conservation){
            return res.status(404).json({message: 'Conservation not found'})
        };
        res.status(200).json({message: 'Conservation fetched', conservation});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}
const sendMessage = async (req, res) =>{
    try {
        const {conversationId} = req.params;
        const {content, type, attachments} = req.body;
        const sender = req.user._id;
        const message = await conservationService.sendMessage(conversationId, sender, content, type, attachments);
        res.status(201).json({message: 'Message sent', message});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}
const addParticipants = async (req, res) =>{
    try {
        const {conservationId, userId} = req.body;
        const updatedConservation = await conservationService.addParticipants(conservationId, userId);
        res.status(200).json({message: 'Participants added', conservation: updatedConservation});
    } catch (error) {
        res.status(400).json({error: error.message});   
    }
}
const removeParticipants = async (req, res) =>{
    try {
        const {conservationId, userId} = req.body;
        const updatedConservation = await conservationService.removeParticipants(conservationId, userId);
        res.status(200).json({message: 'Participants removed', conservation: updatedConservation});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}
const updateConversation = async (req, res) =>{
    try {
        const {conversationId} = req.params;
        const {name} = req.body;
        const updatedConservation = await conservationService.updateConversation(conversationId, name);
        res.status(200).json({message: 'Conversation updated', conservation: updatedConservation});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}

const deleteConversation = async (req, res) =>{
    try {
        const {conversationId} = req.params;
        await conservationService.deleteConversation(conversationId);
        res.status(200).json({message: 'Conversation deleted'});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}
module.exports = {
    createConservation,
    getUserConservations,
    getConservation,
    sendMessage,
    addParticipants,
    removeParticipants,
    updateConversation,
    deleteConversation
}