import React from 'react'
import ExcelUploadForm from '../components/ExcelUploadForm'

const page = () => {
    return (
        <div className='excel-page main-container'>
            <h2>Upload Daily Stats</h2>
            <ExcelUploadForm />
        </div>
    )
}

export default page
