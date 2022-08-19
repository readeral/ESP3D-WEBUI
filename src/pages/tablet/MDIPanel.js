import { Fragment, h } from "preact"
import { useEffect, useState, useRef } from "preact/hooks"
import { useHttpFn } from "../../hooks"
import { espHttpURL } from "../../components/Helpers"
import { showConfirmationModal, showProgressModal } from "../../components/Modal"
import { CenterLeft, Progress } from "../../components/Controls"
import { useUiContext, useUiContextFn } from "../../contexts"
import { T } from "../../components/Translations"
import { files, processor } from "../../targets"

let currentFS = "DIRECTSD"
const currentPath = {}
const filesListCache = {}

const MDIpanel = ({sendCommand, sendSerialCmd, setGCodeLoaded, gCodeLoaded}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [filesList, setFilesList] = useState(filesListCache[currentFS])
    const { createNewRequest, abortRequest } = useHttpFn
    const { modals, toasts } = useUiContext()
    const fileref = useRef()
    const progressBar = {}
    const MDI1 = useRef(null);
    const MDI2 = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null)
    const [gcodePreview, setGcodePreview] = useState('')

    const onCancel = () => {
        useUiContextFn.haptic()
        processor.stopCatchResponse()
        setIsLoading(false)
        toasts.addToast({ content: T("S175"), type: "error" })
        filesListCache[currentFS] = { files: [], status: "S22" }
        setFilesList(filesListCache[currentFS])
    }

    // Send an MDI command when clicking either MDI button
    function handleMDIcommand(ref) {
        switch(ref) {
            case "MDI1": 
                MDI1.current.value.length !== 0 ? sendCommand(MDI1.current.value) : console.log('No gcode command'); break;
            case "MDI2": 
                MDI2.current.value.length !== 0 ? sendCommand(MDI2.current.value) : console.log('No gcode command'); break;
            default: console.log('Ref not established, command value unavailable')
        }
    }

    // Send a MDI command by hitting return in the field
    const handleKeyPress = e => {
        if (e.key === "Enter") {
            sendCommand(e.target.value)
        }
      };

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

    return (
        <Fragment>
            <input
                /*hidden input for loading files*/
                type="file"
                ref={fileref}
                class="d-none"
                onChange={filesSelected}
            />
            <div id="mdi" class="mdi-panel grid-10">
                <div class="mdi-grid grid-10">
                    <input class="form-input input-lg" placeholder="GCode Command" ref={MDI1} onKeyPress={(e) => handleKeyPress(e)}></input><button onClick={() => handleMDIcommand('MDI1')}>MDI</button>
                    <input class="form-input input-lg" placeholder="GCode Command" ref={MDI2} onKeyPress={(e) => handleKeyPress(e)}></input><button onClick={() => handleMDIcommand('MDI2')}>MDI</button>
                    <select class="form-select select-lg" value={selectedFile} onChange={handleSelectChange} >
                        <option value="" selected disabled hidden>Load GCode File</option>
                        {filesList && filesList.files.map(file => <option value={file.name}>{file.name}</option>)}
                    </select>
                    <button onClick={() => openFileUploadBrowser()}>Upload</button><button onClick={() => readFile()}>Load</button>
                </div>
                <textarea class="gcode" id="gcode" rows="8" placeholder="GCode File Display" spellcheck="false" readonly={true}>{gcodePreview}</textarea>
                <canvas id="small-toolpath" class="previewer" width="434" height="170"></canvas>
            </div>
            <div class="grid-10">
                <textarea class="messages" id="messages" rows="4" spellcheck="false" readonly={true}>Serial Messages</textarea>
            </div>
        </Fragment>
    )
}

export default MDIpanel;

