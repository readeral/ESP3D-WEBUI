import { Fragment, h } from "preact"
import { useEffect, useState, useRef } from "preact/hooks"
import { useHttpFn } from "../../hooks"
import { espHttpURL } from "../../components/Helpers"
import { showConfirmationModal, showProgressModal } from "../../components/Modal"
import { CenterLeft, Progress } from "../../components/Controls"
import { useUiContext, useUiContextFn } from "../../contexts"
import { T } from "../../components/Translations"
import { files, processor } from "../../targets"

const MDIpanel = (props) => {
    const {
        fileref,
        filesSelected,
        filesList,
        selectedFile,
        handleSelectChange,
        openFileUploadBrowser,
        readFile,
        gcodePreview,
        sendCommand
    } = props;

    const MDI1 = useRef(null);
    const MDI2 = useRef(null);

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
                <canvas id="small-toolpath" class="previewer"></canvas>
            </div>
        </Fragment>
    )
}

export default MDIpanel;

