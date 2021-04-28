 //Importing and config
 require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const socketio = require("socket.io")
const app = express()
app.use(bodyParser.urlencoded({extended : true}))
app.set("view engine", "ejs")



const schema = new mongoose.Schema({
    user : {
        type : String
    },
    msg : {
        type : Array
    }
})


const socketSchema = new mongoose.Schema({
    clientId : {
        type : String
    },
    clientName : {
        type : String
    }
})





//monooge stuff
// const url = "mongodb://localhost:27017/msgtest"


const url = `mongodb+srv://Vishnu_Sai:${process.env.DBPASS}@cluster0.hkghe.mongodb.net/${process.env.DBNAME}?retryWrites=true&w=majority`
const message = mongoose.model("message", schema)
const socketModel = mongoose.model("socketstuff", socketSchema)
mongoose.connect(url , {
    useNewUrlParser : true,
    useUnifiedTopology: true
}).then((res) => {console.log("res")}).catch((Err) => console.log(Err))









// IO Stuff

const PORT = process.env.PORT || 9000  

const server = app.listen(PORT, () => {
    console.log("Server Started" , PORT)
})

const io = socketio(server)
io.on('connection' , async (socket) => {

   
    
    socket.on("name", (name) => {
        
        
        socketModel.findOne({clientName : name} , (err, res) => {
            if(err) {
                console.log(err)
            }else {
                if(res) {
                    socketModel.findOneAndUpdate({clientName : name},{clientId :socket.id } , (err,result) => {
                        if(err) {
                            console.log(err)
                        }else {
                            console.log("result")
                        }
                    }) 
                }else {
                    let newData = new socketModel({
                        clientName : name ,
                        clientId : socket.id
                    })
            
                    newData.save()
                }
            }
        })
       


      
       

        message.findOne({user : name }, (err, result) => {
            if(err) {
                console.log(err)
            }else {
                if(result) {
                    socket.emit("oldmessages",result.msg)
                }else {
                    let newuser = new message({
                        user : name ,
                        msgsend : [],
                        msgreceive : []
                    })
                    newuser.save()
                }
            }
        })
        let user_data = {
            name : name,
            id : socket.id,
        } 
        socket.emit("id" , user_data.id)
    })
    
    
     
        socket.on("msg" , (data) => {
            let {user, msg,sender} = data
           socketModel.find({} , (err, result) => {
                if(err) {
                    console.log(err)
                }else {
                    if(result) {
             
                        let senderArray = result.filter((e) => {return e.clientId === sender})
                        let senderName = senderArray[0].clientName
                        message.findOne({user : senderName}, (err, found) => {
                            if(err) {
                                console.log(err)
                            }else {
                                if(found) {
                                    let newmsg = {
                                        msg : msg,
                                        isReceived : false,
                                        receiver : user
                                    }
                                    message.findOneAndUpdate({user : senderName}, {$push : {msg : newmsg}} , (err,res) => {
                                        if(err) {
                                            console.log(err)
                                        }else {
                                            console.log(res)
                                        }
                                    })
            
                                    let newmsg2 = {
                                        msg : msg,
                                        isReceived : true,
                                        sender : senderName
                                    } 
            
                                    message.findOneAndUpdate({user : user}, {$push : {msg:newmsg2}} , (err, res) => {
                                        if(err){
                                            console.log(err)
                                        }else {
                                            console.log(res)
                                        }
                                    })
                                
            
                                }else {
                                    console.log("No User Found")
                                }
                            }
                        })
                        result.forEach((e) => {
                            if(e.clientName == user) {
                                let data = {
                                    user : user ,
                                    msg : msg,
                                    sender : senderName
                                }
                                io.to(e.clientId).emit("message" , data)
                            }
                        })
                    
                    }
                }
              

           })
        })


        socket.on("disconnect" , () => {
          
            socketModel.deleteOne({clientId : socket.id} , (err, res) => {
                if(err) {
                    console.log(err)
                }else {
                    console.log("Deleted")
                }
            })
          
        })

})




//Change Steam

const db = mongoose.connection


db.once("open" , () => {
    console.log("Open")
    const collection = db.collection("messages")
    const stream = collection.watch()
    stream.on("change" , (change) => {
        if(change.operationType === "insert") {
            io.emit("new-user", change.fullDocument.user)
        }
    })
})



app.get("/" , (req,res) => {
    var usersProjection = { 
        msg: false,
        _id: false
    };
    
    message.find({} , usersProjection , (err, found) => {
        if(err) {
            console.log(err)
        }else {
            res.render("index", {found : found})

        }
    })

   
})

