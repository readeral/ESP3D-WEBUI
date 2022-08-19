
import { h } from "preact"
import { useEffect, useState, useRef } from "preact/hooks"
import { useHttpFn } from "../../hooks"

import TabletNav from "./tabletNav";
import PositionPanel from "./positionPanel";
import JogPanel from "./jogPanel";
import MDIpanel from "./MDIPanel";

import { espHttpURL, replaceVariables } from "../../components/Helpers"
import { useUiContext, useUiContextFn } from "../../contexts"
import { files, processor, useTargetContext, variablesList } from "../../targets"

let currentFS = "DIRECTSD"
const currentPath = {}
const filesListCache = {}

const Tablet = () => {
    const targetContext = useTargetContext();
    const { modals, toasts } = useUiContext()
    const { createNewRequest, abortRequest } = useHttpFn

    const fileref = useRef()

    const [units, setUnits] = useState('mm')
    const [gCodeLoaded, setGCodeLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [filesList, setFilesList] = useState(filesListCache[currentFS])
    const [selectedFile, setSelectedFile] = useState(null)
    const [gcodePreview, setGcodePreview] = useState('')

    const progressBar = {}
    let currentFeedRate = {};

    function startGcode() {
        useUiContextFn.haptic()
        const cmd =
        files.command(
            currentFS,
            "play",
            currentPath[
                currentFS
            ],
            selectedFile
        )
        sendSerialCmd(
            cmd.cmd
        )
    }

    const onCancel = () => {
        useUiContextFn.haptic()
        processor.stopCatchResponse()
        setIsLoading(false)
        toasts.addToast({ content: T("S175"), type: "error" })
        filesListCache[currentFS] = { files: [], status: "S22" }
        setFilesList(filesListCache[currentFS])
    }


    // Uploads files to filesystem (currently only SD card)
    const uploadFiles = () => {
        setIsLoading(true)
        const cmd = files.command(currentFS, "upload", currentPath[currentFS])
        const list = fileref.current.files
        if (list.length > 0) {
            showProgressModal({
                modals,
                title: T("S32"),
                button1: {
                    cb: abortRequest,
                    text: T("S28"),
                },
                content: <Progress progressBar={progressBar} max="100" />,
            })
            //prepare POST data
            const formData = new FormData()
            formData.append("path", currentPath[currentFS])
            for (let i = 0; i < list.length; i++) {
                const file = list[i]
                const arg =
                    currentPath[currentFS] +
                    (currentPath[currentFS] == "/" ? "" : "/") +
                    file.name +
                    "S"
                //append file size first to check updload is complete
                formData.append(arg, file.size)
                formData.append(
                    "myfiles",
                    file,
                    currentPath[currentFS] +
                        (currentPath[currentFS] == "/" ? "" : "/") +
                        file.name
                )
            }
            //now do request
            createNewRequest(
                espHttpURL(cmd.url),
                { method: "POST", id: "upload", body: formData },
                {
                    onSuccess: (result) => {
                        modals.removeModal(modals.getModalIndex("upload"))
                        const cmdpost = files.command(
                            currentFS,
                            "postUpload",
                            currentPath[currentFS],
                            fileref.current.files[0].name
                        )
                        if (cmdpost.type == "error" || cmdpost.type == "none") {
                            filesListCache[currentFS] = files.command(
                                currentFS,
                                "formatResult",
                                result
                            )
                            setFilesList(filesListCache[currentFS])
                            setIsLoading(false)
                        } else {
                            if (cmdpost.type == "refresh") {
                                //this is needed because the board is still busy
                                setTimeout(() => {
                                    onRefresh(null, cmdpost.arg)
                                }, cmdpost.timeOut)
                            }
                        }
                    },
                    onFail: (error) => {
                        modals.removeModal(modals.getModalIndex("upload"))
                        toasts.addToast({ content: error, type: "error" })
                        setIsLoading(false)
                    },
                    onProgress: (e) => {
                        if (
                            progressBar.update &&
                            typeof progressBar.update === "function"
                        )
                            progressBar.update(e)
                    },
                }
            )
        }
    }

    // Handles selected files and shows upload confirmation modal
    const filesSelected = (e) => {
        const content = []
        const length = fileref.current.files.length
        for (let index = 0; index < length; index++) {
            content.push(<li>{fileref.current.files[index].name}</li>)
            if (
                !files.capability(
                    currentFS,
                    "Upload",
                    currentPath[currentFS],
                    fileref.current.files[index].name
                )
            ) {
                const eMsg = files.capability(
                    currentFS,
                    "Upload",
                    currentPath[currentFS],
                    fileref.current.files[index].name,
                    true
                )
                toasts.add({ content: T(eMsg), type: "error" })
            }
        }

        showConfirmationModal({
            modals,
            title: T("S31"),
            content: <CenterLeft>{content}</CenterLeft>,
            button1: {
                cb: uploadFiles,
                text: T("S27"),
            },
            button2: { text: T("S28") },
        })
    }

    // Setup for file browser window
    const setupFileInput = () => {
        if (currentFS == "") return
        fileref.current.multiple = files.capability(currentFS, "UploadMultiple")
        if (files.capability(currentFS, "UseFilters")) {
            let f = useUiContextFn.getValue("filesfilter").trim()
            if (f.length > 0 && f != "*") {
                f = "." + f.replace(/;/g, ",.")
            } else f = "*"
            fileref.current.accept = f
        } else {
            fileref.current.accept = "*"
        }
    }

    // Clicks the hidden 'file' form field
    const openFileUploadBrowser = () => {
        useUiContextFn.haptic()
        fileref.current.value = ""
        fileref.current.click()
    }

    const onRefresh = (e, usecache = false) => {
        if (e) useUiContextFn.haptic()
        setIsLoading(true)
        if (usecache && filesListCache[currentFS]) {
            if (files.capability(currentFS, "IsFlatFS")) {
                setFilesList(
                    files.command(
                        currentFS,
                        "filterResult",
                        filesListCache[currentFS],
                        currentPath[currentFS]
                    )
                )
            } else {
                setFilesList(filesListCache[currentFS])
            }
            setIsLoading(false)
        } else {
            const cmd = files.command(currentFS, "list", currentPath[currentFS])
            if (cmd.type == "url") {
                createNewRequest(
                    espHttpURL(cmd.url, cmd.args),
                    { method: "GET" },
                    {
                        onSuccess: (result) => {
                            filesListCache[currentFS] = files.command(
                                currentFS,
                                "formatResult",
                                result
                            )
                            setFilesList(filesListCache[currentFS])
                            setIsLoading(false)
                        },
                        onFail: (error) => {
                            console.log(error)
                            setIsLoading(false)
                            toasts.addToast({ content: error, type: "error" })
                        },
                    }
                )
            } else if (cmd.type == "cmd") {
                if (
                    processor.startCatchResponse(
                        currentFS,
                        "list",
                        processFeedback
                    )
                )
                    sendSerialCmd(cmd.cmd)
            }
        }
    }

    // Instantiate the file upload/load system
    useEffect(() => {
        setGCodeLoaded(false);
        setupFileInput();
        if (!currentPath[currentFS]) {
            currentPath[currentFS] = "/"
        }
        onRefresh(null, 'init');
        console.log(filesListCache)
    }, [])

    useEffect(() => {
        console.log(currentPath[currentFS]);
        console.log(filesList)
    }, [filesList])

    function readFile(file) {
        const fetchedFile = file ? file : selectedFile;
        fetch(encodeURI('SD/' + fetchedFile))
        .then(response => response.text() )
        .then(gcode => setGcodePreview(gcode) );
        setGCodeLoaded(true);
    }

    function handleSelectChange(event) {
        setSelectedFile(event.target.value);
        readFile(event.target.value);
    }

    useEffect(() => { //@todo does this need changing to allow the feedrate to be updated? as per XY example below
        if (!currentFeedRate["XY"] || useUiContextFn.getValue("xyfeedrate") !== currentFeedRate["XY"])
            currentFeedRate["XY"] = useUiContextFn.getValue("xyfeedrate")
        if (!currentFeedRate["Z"])
            currentFeedRate["Z"] = useUiContextFn.getValue("zfeedrate")
        if (!currentFeedRate["A"])
            currentFeedRate["A"] = useUiContextFn.getValue("afeedrate")
        if (!currentFeedRate["B"])
            currentFeedRate["B"] = useUiContextFn.getValue("bfeedrate")
        if (!currentFeedRate["C"])
            currentFeedRate["C"] = useUiContextFn.getValue("cfeedrate")
    }, [currentFeedRate])

    //Send a request to the ESP
    const sendCommand = (command) => {
        createNewRequest(
            espHttpURL("command", {
                cmd: replaceVariables(variablesList.commands, command),
            }),
            {
                method: "GET",
                echo: replaceVariables(variablesList.commands, command, true), //need to see the command sent but keep the not printable command as variable
            },
            {
                onSuccess: (result) => {},
                onFail: (error) => {
                    toasts.addToast({ content: error, type: "error" })
                    console.log(error)
                },
            }
        )
    }

    //Send a series of commands to the ESP
    const sendSerialCmd = (command) => {
        const cmds = command.split(";")
        cmds.forEach((cmd) => {
            createNewRequest(
                espHttpURL("command", { cmd: cmd }),
                { method: "GET", echo: cmd },
                {
                    onSuccess: (result) => {
                        //Result is handled on ws so just do nothing
                    },
                    onFail: (error) => {
                        console.log(error)
                        processor.stopCatchResponse()
                        setIsLoading(false)
                        toasts.addToast({ content: error, type: "error" })
                    },
                }
            )
        })
    }

    //Send jog command
    const sendJogCommand = (axis, distance) => {
        let selected_axis
        let feedrate =
            axis.startsWith("X") || axis.startsWith("Y")
                ? currentFeedRate["XY"]
                : axis.startsWith("Z")
                ? currentFeedRate["Z"]
                : currentFeedRate[currentAxis]
        if (axis.startsWith("Axis"))
            selected_axis = axis.replace("Axis", currentAxis)
        else selected_axis = axis
        let cmd =
            "$J=G91 G21 " + selected_axis + distance + " F" + feedrate
         sendCommand(cmd)
    }

    //Send Home command
    const sendHomeCommand = (axis) => {
        let selected_axis
        if (axis == "Axis") selected_axis = currentAxis
        else selected_axis = axis
        const cmd = useUiContextFn
            .getValue("homecmd")
            .replace("#", selected_axis)
         sendCommand(cmd)
    }

    //Send Zero command
    const sendZeroCommand = (axis) => {
        let selected_axis
        if (axis == "Axis") selected_axis = currentAxis + "0"
        else selected_axis = axis + "0"
        if (axis.length == 0) {
            selected_axis = ""
            if (positions.x || positions.wx) selected_axis += " X0"
            if (positions.y || positions.wy) selected_axis += " Y0"
            if (positions.z || positions.wz) selected_axis += " Z0"
            if (positions.a || positions.wa) selected_axis += " A0"
            if (positions.b || positions.wb) selected_axis += " B0"
            if (positions.c || positions.wc) selected_axis += " C0"
        }
        const cmd = useUiContextFn
            .getValue("zerocmd")
            .replace("#", selected_axis.trim())
         sendCommand(cmd)
    }

    const stopAndRecover = () => {
    // stopGCode();
        // To stop GRBL you send a reset character, which causes some modes
        // be reset to their default values.  In particular, it sets G21 mode,
        // which affects the coordinate display and the jog distances.
    // requestModes(); // $G command returns the modes
    }

    return (
        <div id="tablet" class="container tablet">
            <TabletNav
                targetContext={targetContext}
                sendHomeCommand={sendHomeCommand}
                sendCommand={sendCommand}
                gCodeLoaded={gCodeLoaded}
                startGcode={startGcode}
            />
            <PositionPanel
                targetContext={targetContext}
                sendZeroCommand={sendZeroCommand}
                sendHomeCommand={sendHomeCommand}
                sendCommand={sendCommand}
                units={units}
                setUnits={setUnits}
            />
            <JogPanel
                targetContext={targetContext}
                sendJogCommand={sendJogCommand}
                units={units}/>
            <MDIpanel
                sendCommand={sendCommand}
                fileref={fileref}
                filesList={filesList}
                filesSelected={filesSelected}
                selectedFile={selectedFile}
                handleSelectChange={handleSelectChange}
                openFileUploadBrowser={openFileUploadBrowser}
                readFile={readFile}
                gcodePreview={gcodePreview}
            />
        </div>
    )
}

export default Tablet